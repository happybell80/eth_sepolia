import React, { useState, useEffect, useCallback } from "react";
// Ethers v6: 필요한 클래스/함수를 직접 임포트
import { BrowserProvider, Contract, parseUnits, isAddress } from "ethers";
import tokenABI from "./contracts/abi.json"; // ABI 임포트
import './App.css'; // CSS 임포트

// .env 값 읽기
const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS;
const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
const targetNetworkId = process.env.REACT_APP_CHAIN_ID; // 문자열일 수 있음
const targetNetworkName = process.env.REACT_APP_NETWORK_NAME || "Sepolia";

function App() {
  // 상태 변수들
  const [, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [decimals, setDecimals] = useState(18); // 기본값, 나중에 로드

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");

  const [txHash, setTxHash] = useState("");
  const [txStatus, setTxStatus] = useState(""); // '', 'pending_confirmation', 'pending_receipt', 'pending', 'success', 'failed', 'error'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isConnected, setIsConnected] = useState(false); // 지갑 연결 상태

  // 오류 해결: chainId 끝에 'n'이 붙는 이유 -> BigInt 타입이기 때문
  // BigInt와 문자열 ID 비교를 위해 Number로 변환
  const checkNetwork = useCallback(async (web3Provider) => {
    try {
      const { chainId } = await web3Provider.getNetwork();
      if (Number(chainId) !== parseInt(targetNetworkId)) {
          setError(`Please connect to the ${targetNetworkName} Test Network in MetaMask.`);
          setIsConnected(false); // 연결 실패 상태로
          return false;
        }
        setError(""); // 네트워크 맞으면 에러 메시지 초기화
        return true;
      } catch (networkError) {
        console.error("Could not get network:", networkError);
        setError("Could not detect network. Please check MetaMask connection.");
        setIsConnected(false);
        return false;
      }
  }, []); // targetNetworkId, targetNetworkName은 .env 값이라 보통 불변

   // 지갑 연결 함수
  const connectWallet = useCallback(async () => {
    setError("");
    setLoading(true);
    if (!window.ethereum) {
      setError("MetaMask is not installed. Please install it.");
      setLoading(false);
      return;
    }

    try {
      const web3Provider = new BrowserProvider(window.ethereum, "any");
      // 계정 접근 권한 요청
      await web3Provider.send("eth_requestAccounts", []);
      const web3Signer = await web3Provider.getSigner();
      const currentAccount = await web3Signer.getAddress();

      // 네트워크 확인
      const networkOk = await checkNetwork(web3Provider);
      if (!networkOk) {
        setLoading(false);
         return; // 잘못된 네트워크면 중단
      }

      setProvider(web3Provider);
      setSigner(web3Signer);
      setAccount(currentAccount);

      const tokenContract = new Contract(contractAddress, tokenABI, web3Signer);
      setContract(tokenContract);

      try {
          const dec = await tokenContract.decimals();
          setDecimals(Number(dec)); // BigInt -> Number
      } catch (decError) {
          console.error("Failed to get decimals:", decError);
          setError("Could not fetch token decimals from contract.");
          // 연결은 되었으나, 추가 정보 로드 실패 시 처리
      }

      setIsConnected(true); // 성공적으로 연결됨
      console.log("Wallet connected:", currentAccount);

    } catch (err) {
      console.error("Wallet connection failed:", err);
      setError(err.message || "Failed to connect wallet.");
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  }, [checkNetwork]); // checkNetwork 함수 의존성 추가


  // 상태 폴링 함수 (useCallback으로 감싸기)
  const pollTxStatus = useCallback(async (hash) => {
    console.log(`Polling status for tx: ${hash}`);
    setLoading(true); // 로딩 시작
    setTxStatus('pending'); // 백엔드 확인 중 상태

    // 즉시 한 번 확인
    try {
        const response = await fetch(`${backendUrl}/tx_status/${hash}`);
        // 오류 해결: response.json() 전에 응답 상태 확인
        if (!response.ok) {
            throw new Error(`Backend responded with status: ${response.status}`);
        }
        const result = await response.json(); // 여기서 SyntaxError 발생 가능성 있음

        if (result.status && result.status !== "pending") {
            setTxStatus(result.status);
            setLoading(false);
            console.log(`Initial check for tx ${hash}: ${result.status}`);
            return; // 최종 상태면 폴링 종료
        }
    } catch (fetchError) {
        console.error("Initial polling error:", fetchError);
        // 오류 해결: "Failed to fetch..." 또는 "SyntaxError..." 오류 처리
        if (fetchError instanceof SyntaxError) {
            setError("Received invalid response from backend. Check backend logs.");
        } else {
            setError("Failed to fetch transaction status from backend.");
        }
        setTxStatus("error");
        setLoading(false);
         return; // 에러 시 폴링 종료
    }

    // 최종 상태 아니면 주기적 폴링 시작
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${backendUrl}/tx_status/${hash}`);
        if (!response.ok) {
          // 네트워크 오류 또는 백엔드 에러
          console.warn(`Backend request failed during polling: ${response.status}`);
          // 계속 시도하거나, 특정 횟수 후 중단
          return;
        }
        const result = await response.json(); // JSON 파싱
        console.log("Poll result:", result);

        if (result.status && result.status !== "pending") {
          setTxStatus(result.status); // 'success' or 'failed' or 'error'
          clearInterval(interval);
          setLoading(false);
          console.log(`Polling finished for tx ${hash}: ${result.status}`);
        } else if (result.status === "pending") {
          setTxStatus("pending"); // 계속 pending 상태 업데이트
        } else {
          console.warn("Unexpected status from backend:", result);
          setError("Received unexpected status from backend.");
          setTxStatus("error");
          clearInterval(interval);
          setLoading(false);
        }
      } catch (fetchError) {
        console.error("Polling error:", fetchError);
        if (fetchError instanceof SyntaxError) {
            setError("Received invalid response from backend during polling. Check backend logs.");
        } else {
            setError("Failed to fetch transaction status from backend during polling.");
        }
        setTxStatus("error");
        clearInterval(interval);
        setLoading(false);
      }
    }, 3000); // 3초마다 확인

    // Interval ID를 반환하여 외부에서 clear 할 수 있도록 (선택적)
    // return interval;
  }, []); // backendUrl 의존성 추가 오류로 인해 제거


  // 토큰 전송 함수 (useCallback으로 감싸기)
  const sendTokens = useCallback(async () => {
    if (!contract || !signer || !recipient || !amount) {
      setError("Please connect wallet and fill all fields.");
      return;
    }
    // 오류 해결: isAddress 직접 사용 (ethers v6)
    if (!isAddress(recipient)) {
      setError("Invalid recipient address.");
      return;
    }

    setLoading(true);
    setError("");
    setTxHash("");
    setTxStatus(""); // 초기화

    try {
      // 오류 해결: parseUnits 직접 사용 (ethers v6)
      const amountToSend = parseUnits(amount, decimals);

      console.log(`Sending ${amount} (${amountToSend.toString()}) tokens with ${decimals} decimals to ${recipient}`);

      setTxStatus('pending_confirmation'); // MetaMask 확인 대기
      const tx = await contract.transfer(recipient, amountToSend);
      setTxHash(tx.hash);
      console.log("Transaction sent, waiting for receipt:", tx.hash);

      setTxStatus('pending_receipt'); // 블록 포함 대기
      await tx.wait(); // 트랜잭션이 블록에 포함될 때까지 대기
      console.log("Transaction confirmed in block.");

      // 상태 폴링 시작
      pollTxStatus(tx.hash);

    } catch (err) {
      console.error("Transaction failed:", err);
      // 사용자가 거부했거나 가스 부족 등
      setError(err.reason || err.message || "Transaction failed.");
      setTxStatus('error'); // 에러 상태 설정
      setLoading(false); // 로딩 중지
    }
    // finally 블록 제거: pollTxStatus가 완료될 때 loading = false 처리
  }, [contract, signer, recipient, amount, decimals, pollTxStatus]); // 필요한 모든 의존성 추가


  // MetaMask 이벤트 리스너 설정 (useCallback 사용)
  const handleAccountsChanged = useCallback(async (accounts) => {
    console.log('Accounts changed:', accounts);
    if (accounts.length > 0) {
        // 계정 변경 시 다시 연결 시도 또는 상태 업데이트
        setError(""); // 이전 에러 초기화
        await connectWallet(); // 연결 함수 재호출
    } else {
        // 연결 해제됨
        setIsConnected(false);
        setAccount(null);
        setSigner(null);
        setContract(null);
        setError("Wallet disconnected. Please connect again.");
    }
  }, [connectWallet]); // connectWallet 의존성 추가

  const handleChainChanged = useCallback((chainId) => {
    console.log('Network changed:', chainId);
    // 네트워크 변경 시 페이지 새로고침 또는 다시 연결 유도
    // connectWallet(); // 또는
    window.location.reload(); // 간단하게 새로고침
  }, []);


  useEffect(() => {
    if (window.ethereum) {
      // 이미 연결되어 있는지 확인 시도 (선택적)
      // connectWallet();

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      // 클린업 함수
      return () => {
        if (window.ethereum?.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleAccountsChanged, handleChainChanged]); // 의존성 배열에 핸들러 추가


  return (
    <div className="App">
      <header className="App-header">
        <h1>Token Transfer dApp ({targetNetworkName})</h1>
        {!isConnected ? (
          <button onClick={connectWallet} disabled={loading}>
            {loading ? "Connecting..." : "Connect MetaMask"}
          </button>
        ) : (
          <div>
            <p>Account: {account?.substring(0, 6)}...{account?.substring(account.length - 4)}</p>
            <p>(Decimals: {decimals})</p>
            <div className="transfer-form">
              <input
                type="text"
                placeholder="Recipient Address (0x...)"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                disabled={loading}
              />
              <input
                type="text"
                placeholder={`Amount (e.g., 1.23)`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={loading}
              />
              <button onClick={sendTokens} disabled={loading || !recipient || !amount}>
                {/* 로딩 상태에 따른 버튼 텍스트 변경 */}
                {loading && txStatus === 'pending_confirmation' ? "Confirm in Wallet..." :
                loading && txStatus === 'pending_receipt' ? "Waiting for Block..." :
                loading && txStatus === 'pending' ? "Checking Status..." :
                loading ? "Processing..." : // 일반 로딩
                "Send Tokens"}
              </button>
            </div>
          </div>
        )}

        {/* 에러 메시지 표시 */}
        {error && <p className="error-message">Error: {error}</p>}

        {/* 트랜잭션 정보 표시 */}
        {txHash && (
          <div className="tx-info">
            <p>
              Tx Hash:{" "}
              <a
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {txHash.substring(0, 10)}...{txHash.substring(txHash.length - 8)}
              </a>
            </p>
            {/* 상태에 따른 텍스트 표시 */}
            <p>Status: <span className={`status-${txStatus}`}>
                {txStatus === 'pending_confirmation' ? "Waiting for Wallet Confirmation" :
                txStatus === 'pending_receipt' ? "Waiting for Transaction Receipt" :
                txStatus === 'pending' ? "Pending (Checking Backend)" :
                txStatus === 'success' ? "Success" :
                txStatus === 'failed' ? "Failed" :
                txStatus === 'error' ? "Error" :
                "Initializing..."}
            </span></p>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
