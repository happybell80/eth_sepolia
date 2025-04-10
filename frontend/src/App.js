import React, { useState, useEffect } from "react";
import { BrowserProvider, Contract, parseUnits, isAddress, formatUnits} from "ethers";
import tokenABI from "./contracts/abi.json"; // 복사한 ABI 파일 경로
import './App.css'; // 기본 CSS

const App = () => {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [decimals, setDecimals] = useState(18); // 기본값, 나중에 로드됨

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");

  const [txHash, setTxHash] = useState("");
  const [txStatus, setTxStatus] = useState(""); // 'pending', 'success', 'failed', 'error'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS;
  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000"; // 백엔드 주소

  // MetaMask 연결 및 기본 설정
  const connectWallet = async () => {
    setError("");
    if (window.ethereum) {
      try {
        // 새 방식: 공급자 가져오기
        const web3Provider = new BrowserProvider(window.ethereum, "any"); // "any"는 네트워크 변경 감지

        // 계정 요청
        await web3Provider.send("eth_requestAccounts", []);
        const web3Signer = await web3Provider.getSigner();
        const currentAccount = await web3Signer.getAddress();

        // 네트워크 확인 (Sepolia chainId: 11155111)
        const { chainId } = await web3Provider.getNetwork();

        if (Number(chainId) !== 11155111) {
          setError("Please connect to the Sepolia Test Network in MetaMask.");
          // 네트워크 변경 요청 (선택적)
          // try {
          //   await window.ethereum.request({
          //     method: 'wallet_switchEthereumChain',
          //     params: [{ chainId: '0xaa36a7' }], // Sepolia chainId in hex
          //   });
          // } catch (switchError) {
          //   // 사용자가 거부한 경우 등
          //   console.error("Failed to switch network", switchError);
          // }
          return;
        }

        setProvider(web3Provider);
        setSigner(web3Signer);
        setAccount(currentAccount);

        // 컨트랙트 인스턴스 생성
        const tokenContract = new Contract(contractAddress, tokenABI, web3Signer);
        setContract(tokenContract);

        // 토큰 Decimals 가져오기
        const dec = await tokenContract.decimals();
        setDecimals(dec);

        console.log("Wallet connected:", currentAccount);
        console.log("Contract loaded at:", contractAddress);
        console.log("Token decimals:", dec);

      } catch (err) {
        console.error("Wallet connection failed:", err);
        setError(err.message || "Failed to connect wallet.");
      }
    } else {
      setError("MetaMask is not installed. Please install it to use this app.");
    }
  };
  useEffect(() => {
    // 계정 변경 처리 함수 (async 추가)
    const handleAccountsChanged = async (accounts) => {
        console.log('Accounts changed:', accounts);
        if (accounts.length > 0) {
            setAccount(accounts[0]);
            // !!! 중요: v6 스타일로 provider, signer, contract 재생성 !!!
            if (window.ethereum) { // window.ethereum이 여전히 유효한지 확인
                try {
                    // BrowserProvider, Contract가 파일 상단에 import 되어 있는지 확인
                    const web3Provider = new BrowserProvider(window.ethereum, "any");
                    const web3Signer = await web3Provider.getSigner(); // await 추가
                    const newAddress = await web3Signer.getAddress();
                    setAccount(newAddress);
                    setSigner(web3Signer);
                    
                    const tokenContract = new Contract(contractAddress, tokenABI, web3Signer);
                    setContract(tokenContract);
                    console.log("Re-initialized provider, signer, and contract for new account.");
                } catch (error) {
                    console.error("Error re-initializing after account change:", error);
                    setError("Failed to update for new account. Please refresh or reconnect.");
                    // 이전 상태 초기화
                    setAccount(null);
                    setSigner(null);
                    setContract(null);
                }
            }
        } else {
            // 계정 연결 해제 시 상태 초기화
            setAccount(null);
            setSigner(null);
            setContract(null);
            setError("Wallet disconnected. Please connect again.");
        }
    };

    // 네트워크 변경 처리 함수
    const handleChainChanged = (chainId) => {
        console.log('Network changed:', chainId);
        // 간단하게 페이지 새로고침 처리
        window.location.reload();
    };

    // 이벤트 리스너 등록
    if (window.ethereum) {
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);
    }

    // 클린업 함수: 컴포넌트 언마운트 시 리스너 제거
    return () => {
        if (window.ethereum?.removeListener) { // removeListener 존재 여부 확인
            window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
            window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
    };

    // 의존성 배열: 이 값들이 변경될 때만 effect 재실행
    // tokenABI는 보통 변경되지 않으므로 빼도 무방할 수 있음
}, [contractAddress, tokenABI]); // contractAddress와 tokenABI가 effect 내부에서 사용되므로 추가
  // 지갑 연결 상태 감지

  // 토큰 전송 함수
  const sendTokens = async () => {
    if (!contract || !signer || !recipient || !amount) {
      setError("Please connect your wallet and fill in all fields.");
      return;
    }
    if (!isAddress(recipient)) {
      setError("Invalid recipient address.");
      return;
    }

    setLoading(true);
    setError("");
    setTxHash("");
    setTxStatus("");

    try {
      // 금액을 BigNumber로 변환 (소수점 고려)
      const amountToSend = parseUnits(amount, decimals);

      console.log(`Sending <span class="math-inline">\{amount\} \(</span>{amountToSend.toString()}) tokens to ${recipient}`);

      // 트랜잭션 전송
      const tx = await contract.transfer(recipient, amountToSend);
      setTxHash(tx.hash);
      setTxStatus("pending_confirmation"); // 사용자가 MetaMask에서 확인 중
      console.log("Transaction sent, waiting for confirmation:", tx.hash);

      // 트랜잭션이 블록에 포함될 때까지 대기 (MetaMask 확인 후)
      setTxStatus("pending_receipt"); // 블록 포함 대기 중
      const receipt = await tx.wait(); // 이 단계에서 실패하면 에러 발생
      console.log("Transaction confirmed in block:", receipt.blockNumber);

      // 백엔드 폴링 시작
      setTxStatus("pending"); // 백엔드 확인 시작
      pollTxStatus(tx.hash);

    } catch (err) {
      console.error("Transaction failed:", err);
      // 사용자가 트랜잭션을 거부했거나, 가스 부족 등의 에러 처리
      setError(err.reason || err.message || "Transaction failed.");
      setTxStatus("error");
      setLoading(false);
    }
  };

  // 백엔드 API를 주기적으로 호출하여 트랜잭션 상태 확인
  const pollTxStatus = async (hash) => {
    console.log(`Polling status for tx: ${hash}`);
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`<span class="math-inline">\{backendUrl\}/tx\_status/</span>{hash}`);
        if (!response.ok) {
          // 네트워크 에러 또는 백엔드 에러
          console.warn(`Backend request failed: ${response.status}`);
          // 특정 횟수 시도 후 중단하거나, 계속 시도할 수 있음
          // 여기서는 일단 다음 폴링 시도
          return;
        }
        const result = await response.json();
        console.log("Poll result:", result);

        if (result.status && result.status !== "pending") {
          setTxStatus(result.status); // 'success' or 'failed' or 'error'
          clearInterval(interval);
          setLoading(false);
          console.log(`Polling finished for tx ${hash}: ${result.status}`);
        } else if (result.status === "pending") {
          setTxStatus("pending"); // 계속 pending 상태 업데이트
        } else {
          // 예상치 못한 응답 처리
          console.warn("Unexpected status from backend:", result);
          setTxStatus("error");
          setError("Received unexpected status from backend.");
          clearInterval(interval);
          setLoading(false);
        }
      } catch (fetchError) {
        console.error("Polling error:", fetchError);
        // 네트워크 문제 등으로 fetch 자체가 실패한 경우
        setError("Failed to fetch transaction status from backend.");
        setTxStatus("error");
        clearInterval(interval);
        setLoading(false);
      }
    }, 3000); // 3초마다 확인

    // 일정 시간 후에도 계속 pending이면 타임아웃 처리 (선택적)
    // setTimeout(() => {
    //   if (txStatus === 'pending') {
    //     clearInterval(interval);
    //     setError("Transaction status check timed out.");
    //     setTxStatus("error");
    //     setLoading(false);
    //   }
    // }, 60000); // 60초 후 타임아웃
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Token Transfer dApp</h1>
        {!account ? (
          <button onClick={connectWallet}>Connect MetaMask</button>
        ) : (
          <div>
            <p>Connected Account: {account.substring(0, 6)}...{account.substring(account.length - 4)}</p>
            <p>Token Decimals: {decimals}</p>
            <div className="transfer-form">
              <input
                type="text"
                placeholder="Recipient Address (0x...)"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                disabled={loading}
              />
              <input
                type="text" // type="number"는 큰 수나 소수점 입력에 불편할 수 있음
                placeholder={`Amount (e.g., 1.23)`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={loading}
              />
              <button onClick={sendTokens} disabled={loading || !recipient || !amount}>
                {loading ? "Processing..." : "Send Tokens"}
              </button>
            </div>
          </div>
        )}

        {error && <p className="error-message">Error: {error}</p>}

        {txHash && (
          <div className="tx-info">
            <p>
              Transaction Hash:{" "}
              <a
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {txHash.substring(0, 10)}...{txHash.substring(txHash.length - 8)}
              </a>
            </p>
            <p>Status: <span className={`status-${txStatus}`}>{txStatus || "Initializing..."}</span></p>
          </div>
        )}
      </header>
    </div>
  );
};

export default App;