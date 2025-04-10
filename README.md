
**최종 업데이트:** 2025년 4월 11일 오전 1시 54분 KST (서울 기준)

## 소개

이 가이드는 Windows 환경에서 WSL(Ubuntu)을 사용하여 간단한 ERC-20 토큰 전송 및 조회 dApp(Decentralized Application)을 개발하는 전체 과정을 안내합니다. 다음 기술 스택을 사용합니다:

* **스마트 컨트랙트:** Foundry (Solidity)
* **백엔드:** FastAPI (Python, web3.py)
* **프론트엔드:** React (JavaScript, ethers.js)
* **네트워크:** Sepolia 테스트넷

이 문서는 기본적인 설치부터 최종 실행 및 테스트까지의 단계를 포함하며, 과정 중에 발생했던 주요 오류들과 해결 방법을 함께 설명합니다.

## 1단계: WSL 및 필수 개발 도구 설치

**주의:** 모든 명령어는 **WSL/Ubuntu 터미널**에서 실행합니다.

1.  **WSL 및 Ubuntu 설치:**
    * PowerShell(관리자)에서 `wsl --install` 실행 또는 Microsoft Store에서 Ubuntu 설치. ([Microsoft WSL 설치 가이드](https://learn.microsoft.com/ko-kr/windows/wsl/install) 참조)
    * Ubuntu 실행 및 초기 사용자 설정 완료.

2.  **Ubuntu 시스템 업데이트 및 기본 도구 설치:**
    ```bash
    sudo apt update && sudo apt upgrade -y
    sudo apt install -y curl git build-essential
    ```

3.  **Git 전역 설정:**
    ```bash
    git config --global user.name "Your Name"
    git config --global user.email "you@example.com"
    ```

4.  **Python 설치 (Python3, pip, venv):**
    ```bash
    sudo apt install -y python3-pip python3-venv
    python3 --version
    pip3 --version
    ```

5.  **Node.js 설치 (NVM 사용 권장):**
    ```bash
    curl -o- [https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh](https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh) | bash
    # 터미널 재시작 또는 환경변수 로드
    export NVM_DIR="$HOME/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"; [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
    nvm install --lts # 최신 LTS 버전 설치
    node -v
    npm -v
    ```

6.  **Foundry 설치:**
    ```bash
    curl -L [https://foundry.paradigm.xyz](https://foundry.paradigm.xyz) | bash
    # 터미널 재시작 또는 환경변수 로드
    source ~/.bashrc # 또는 .profile / .zshrc 등 사용 셸에 맞게
    foundryup # 최신 바이너리 설치
    forge --version # 설치 확인
    ```

7.  **외부 서비스 준비:**
    * **MetaMask:** 브라우저에 설치, 계정 생성/가져오기, Sepolia 네트워크 추가, 개인 키 안전하게 백업.
    * **Sepolia 테스트 ETH:** [Sepolia Faucet](https://sepoliafaucet.com/) 등에서 테스트 ETH 받기.
    * **Infura/Alchemy API 키:** [Infura](https://infura.io) 또는 [Alchemy](https://alchemy.com) 가입 후 Sepolia 네트워크용 **HTTPS URL** 발급받기. 이 URL은 비밀로 유지.
    * **(선택) Etherscan API 키:** [Etherscan](https://etherscan.io/) 가입 후 API 키 발급받기 (코드 검증 시 필요).

## 2단계: 프로젝트 구조 생성 및 Git 초기화

```bash
# 원하는 상위 폴더로 이동
mkdir -p ~/projects/fullstack-token-dapp
cd ~/projects/fullstack-token-dapp

git init

# .gitignore 파일 생성
echo "# Environments" > .gitignore
echo ".env" >> .gitignore
echo "*.env" >> .gitignore
echo "" >> .gitignore
echo "# Logs" >> .gitignore
echo "*.log" >> .gitignore
echo "" >> .gitignore
echo "# Python" >> .gitignore
echo "__pycache__/" >> .gitignore
echo "venv/" >> .gitignore
echo "*.pyc" >> .gitignore
echo "" >> .gitignore
echo "# Node" >> .gitignore
echo "node_modules/" >> .gitignore
echo "npm-debug.log*" >> .gitignore
echo "yarn-debug.log*" >> .gitignore
echo "yarn-error.log*" >> .gitignore
echo "build/" >> .gitignore # React build output
echo ".pnp.*" >> .gitignore
echo ".yarn/*" >> .gitignore
echo "!/.yarn/patches" >> .gitignore
echo "!/.yarn/plugins" >> .gitignore
echo "!/.yarn/releases" >> .gitignore
echo "!/.yarn/sdks" >> .gitignore
echo "!/.yarn/versions" >> .gitignore
echo "" >> .gitignore
echo "# Foundry" >> .gitignore
echo "cache/" >> .gitignore
echo "out/" >> .gitignore
echo "broadcast/" >> .gitignore
echo "deploy-config.json" >> .gitignore # If using deploy config file
echo "foundry.toml.lock" >> .gitignore # If using lock file

git add .gitignore
git commit -m "Initial commit with .gitignore"
## 3단계: 스마트 컨트랙트 개발 및 배포 (Foundry)

1. **Foundry 프로젝트 초기화:**
    
    Bash
    
    ```
    # fullstack-token-dapp 디렉토리 내에서 실행
    forge init token_project --force
    cd token_project
    ```
    
2. **의존성 설치:**
    
    Bash
    
    ```
    forge install OpenZeppelin/openzeppelin-contracts
    ```
    
3. **`src/Token.sol` 작성:**
    
    Solidity
    
    ```
    // SPDX-License-Identifier: MIT
    pragma solidity ^0.8.20;
    
    import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
    import "@openzeppelin/contracts/access/Ownable.sol";
    
    contract MyToken is ERC20, Ownable {
        // 생성자에서 토큰 이름, 심볼 및 초기 소유자 설정
        constructor(address initialOwner) ERC20("MyToken", "MTK") Ownable(initialOwner) {
            // 초기 소유자에게 1,000,000개의 토큰 발행 (소수점 18자리 고려)
            _mint(initialOwner, 1000000 * 10 ** decimals());
        }
    
        // 추가 발행 함수 (소유자만 가능)
        function mint(address to, uint256 amount) public onlyOwner {
            _mint(to, amount);
        }
    }
    ```
    
4. **`script/Deploy.s.sol` 작성:**
    
    Solidity
    
    ```
    // SPDX-License-Identifier: MIT
    pragma solidity ^0.8.20;
    
    import { Script, console } from "forge-std/Script.sol";
    import { MyToken } from "../src/Token.sol";
    
    contract Deploy is Script {
        function run() external returns (MyToken) {
            // .env 파일에서 개인 키 읽기
            uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
            // 개인 키로부터 배포자 주소 얻기
            address initialOwner = vm.addr(deployerPrivateKey);
    
            // 배포 트랜잭션 시작 (개인 키 사용)
            vm.startBroadcast(deployerPrivateKey);
    
            console.log("Deploying MyToken with initial owner:", initialOwner);
            // 컨트랙트 배포 (생성자에 초기 소유자 전달)
            MyToken token = new MyToken(initialOwner);
    
            // 배포 트랜잭션 종료
            vm.stopBroadcast();
            console.log("MyToken deployed to:", address(token));
            return token; // 배포된 컨트랙트 인스턴스 반환
        }
    }
    ```
    
5. **`token_project/.env` 파일 생성:**
    
    - `token_project` 디렉토리에 `.env` 파일을 만들고 아래 내용을 실제 값으로 채웁니다. **값 주변에 따옴표나 공백이 없어야 합니다.**
        
        코드 스니펫
        
        ```
        PRIVATE_KEY=0xyour_metamask_private_key_here
        RPC_URL=[https://sepolia.infura.io/v3/your_api_key_here](https://sepolia.infura.io/v3/your_api_key_here)
        # 선택: Etherscan API 키 (etherscan.io 에서 발급)
        ETHERSCAN_API_KEY=your_etherscan_api_key_here
        ```
        
6. **`foundry.toml` 확인 및 수정:**
    
    - `token_project/foundry.toml` 파일을 열고, Sepolia 직접 배포 시 불필요한 `fork_url` 설정이 `[profile.default]` 등에 없는지 확인하고 제거하거나 주석처리(`#`)합니다.
    - (권장) 아래와 같이 `[rpc_endpoints]`와 `[etherscan]` 설정을 추가하면 배포 명령어 사용이 간편해집니다.
        
        Ini, TOML
        
        ```
        [profile.default]
        src = "src"
        out = "out"
        libs = ["lib"]
        # via_ir = true # Yul/IR 통한 최적화 (선택 사항)
        # optimizer_runs = 200 # 최적화 횟수 (선택 사항)
        
        [rpc_endpoints]
        sepolia = "${RPC_URL}" # .env 변수 참조
        
        [etherscan]
        sepolia = { key = "${ETHERSCAN_API_KEY}" } # .env 변수 참조
        ```
        
7. **컨트랙트 컴파일:**
    
    Bash
    
    ```
    forge build
    ```
    
8. **컨트랙트 배포:**
    
    - `token_project` 디렉토리에서 실행합니다.
    - **오류 해결:**
        - `Error: Failed to decode private key`: `.env` 파일의 `PRIVATE_KEY` 값 형식(0x 시작, 66자) 또는 `forge script` 명령어의 변수 참조 방식(`$PRIVATE_KEY`) 확인.
        - `error: a value is required for '--fork-url <URL>'`: `foundry.toml` 파일에서 불필요한 `fork_url` 설정을 제거/주석 처리.
        - `Error: [...] Invalid API Key`: Etherscan API 키를 Etherscan 웹사이트에서 발급받았는지, `.env` 및 `foundry.toml`에 정확히 설정했는지 확인.
    - **실행 명령어 (권장):** (`foundry.toml`에 `rpc_endpoints`, `etherscan` 설정 완료 시)
        
        Bash
        
        ```
        forge script script/Deploy.s.sol:Deploy --rpc-url sepolia --broadcast --verify
        ```
        
    - **배포 로그 확인:**
        - `Warning: Etherscan could not detect the deployment...`: Etherscan 인덱싱 지연으로 인한 정상적인 대기 상태입니다.
        - `Details: Pending in queue`: Etherscan 검증 대기열에서 처리 중인 정상 상태입니다.
        - **`Details: Pass - Verified`**: 최종적으로 이 메시지가 나오면 배포 및 검증 성공입니다.
    - **컨트랙트 주소 기록:** 성공 로그에 나온 `MyToken deployed to: 0x...` 주소를 복사하여 다음 단계에서 사용합니다.
9. **Git 커밋:**
    
    Bash
    
    ```
    cd .. # 상위 디렉토리로 이동
    git add token_project/
    git commit -m "feat(contracts): Add MyToken contract and deployment script"
    ```
    

## 4단계: 백엔드 개발 (FastAPI)

1. **디렉토리 생성 및 가상 환경 설정:**
    
    Bash
    
    ```
    # fullstack-token-dapp 디렉토리 내에서 실행
    mkdir backend
    cd backend
    python3 -m venv venv
    source venv/bin/activate
    ```
    
2. **의존성 설치:**
    
    Bash
    
    ```
    pip install fastapi uvicorn web3 python-dotenv websockets
    ```
    
3. **`backend/.env` 파일 생성:**
    
    - `backend` 디렉토리에 `.env` 파일을 만들고 아래 내용을 채웁니다.
        
        코드 스니펫
        
        ```
        RPC_URL=[https://sepolia.infura.io/v3/your_api_key_here](https://sepolia.infura.io/v3/your_api_key_here)
        # 3단계에서 배포 후 기록한 컨트랙트 주소
        CONTRACT_ADDRESS=0xyour_deployed_contract_address_here
        ```
        
4. **`backend/abi.json` 파일 생성:**
    
    - **오류 해결:** `FileNotFoundError: abi.json` 오류는 이 파일을 만들지 않아서 발생합니다.
    - `../token_project/out/Token.sol/MyToken.json` 파일을 엽니다.
    - `"abi": [...]` 부분에서 **대괄호(`[]`) 배열 전체**를 복사합니다.
    - `backend/abi.json` 파일을 새로 만들고 복사한 내용을 붙여넣습니다. 파일에는 ABI 배열만 있어야 합니다.
5. **`backend/main.py` 작성:**
    
    - **오류 해결:** `IndentationError: unexpected indent` on line 1 오류는 파일 첫 줄 앞에 공백이 있을 때 발생합니다. 첫 줄 `import os` 앞에 공백이 없도록 수정합니다.
    
    Python
    
    ```
    import os
    import json
    import logging
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    from web3 import Web3
    from dotenv import load_dotenv
    
    # .env 파일 로드
    load_dotenv()
    
    # 로깅 설정
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s', filename='app.log', filemode='a')
    console_handler = logging.StreamHandler() # 콘솔 출력 핸들러
    console_handler.setLevel(logging.INFO)
    formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    console_handler.setFormatter(formatter)
    logger = logging.getLogger('') # 루트 로거 가져오기
    logger.addHandler(console_handler) # 콘솔 핸들러 추가
    
    app = FastAPI()
    
    # CORS 설정
    origins = [
        "http://localhost:3000", # React 개발 서버
    ]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Web3 설정
    rpc_url = os.getenv("RPC_URL")
    contract_address = os.getenv("CONTRACT_ADDRESS")
    
    if not rpc_url:
        logger.error("RPC_URL missing in .env")
        raise ValueError("RPC_URL must be set")
    if not contract_address:
        logger.error("CONTRACT_ADDRESS missing in .env")
        raise ValueError("CONTRACT_ADDRESS must be set")
    
    try:
        w3 = Web3(Web3.HTTPProvider(rpc_url))
        if not w3.is_connected():
            logger.error(f"Failed to connect to RPC: {rpc_url}")
            raise ConnectionError(f"Failed to connect to RPC: {rpc_url}")
        checksum_address = Web3.to_checksum_address(contract_address)
    except Exception as e:
        logger.error(f"Web3 provider or address error: {e}")
        raise
    
    try:
        with open("abi.json") as f:
            abi = json.load(f)
    except FileNotFoundError:
        logger.error("abi.json not found in backend directory.")
        raise
    except json.JSONDecodeError:
        logger.error("Could not decode abi.json. Check JSON validity.")
        raise
    except Exception as e:
        logger.error(f"Failed to load abi.json: {e}")
        raise
    
    try:
        contract = w3.eth.contract(address=checksum_address, abi=abi)
    except Exception as e: # ABI나 주소가 잘못되었을 때 발생 가능
        logger.error(f"Failed to create contract instance: {e}")
        raise
    
    logger.info(f"Successfully connected to RPC: {rpc_url.split('/')[-2]}...") # API 키 일부 가리기
    logger.info(f"Contract address set to: {checksum_address}")
    
    @app.get("/")
    def read_root():
        return {"message": "Token Transfer Backend Running"}
    
    @app.get("/tx_status/{tx_hash}")
    async def get_tx_status(tx_hash: str):
        logger.info(f"Checking status for tx: {tx_hash}")
        try:
            # 트랜잭션 해시 유효성 검사 (선택 사항이지만 권장)
            if not (tx_hash.startswith('0x') and len(tx_hash) == 66):
                 logger.warning(f"Invalid transaction hash format received: {tx_hash}")
                 return {"status": "error", "message": "Invalid transaction hash format"}
    
            receipt = w3.eth.get_transaction_receipt(tx_hash)
            if receipt is None:
                logger.info(f"Tx {tx_hash} status: pending")
                return {"status": "pending"}
            elif receipt.status == 1:
                logger.info(f"Tx {tx_hash} status: success")
                return {"status": "success"}
            else:
                logger.warning(f"Tx {tx_hash} status: failed (receipt status 0)")
                return {"status": "failed"}
        except Exception as e:
            logger.error(f"Error checking tx {tx_hash}: {e}", exc_info=True) # 에러 상세 정보 로깅
            # 사용자에게는 일반적인 에러 메시지 반환
            return {"status": "error", "message": "An error occurred while checking transaction status."}
    
    # 서버 시작 완료 로그
    logger.info("FastAPI application startup complete. Waiting for requests...")
    ```
    
6. **백엔드 서버 실행:**
    
    Bash
    
    ```
    # backend 디렉토리, venv 활성화 상태에서 실행
    uvicorn main:app --reload --host 0.0.0.0 --port 8000
    ```
    
    - **오류 해결:** `Failed to fetch transaction status from backend.` (프론트엔드 오류) 또는 `SyntaxError: Unexpected token '<', ... is not valid JSON` (프론트엔드 오류) 발생 시, 이 단계에서 백엔드 서버가 정상 실행되는지, 그리고 `/tx_status/...` 요청 시 **백엔드 터미널에 오류 로그가 찍히는지** 반드시 확인해야 합니다. 백엔드 오류가 원인입니다.
7. **Git 커밋:**
    
    Bash
    
    ```
    deactivate # 선택 사항
    cd ..
    git add backend/
    git commit -m "feat: Add FastAPI backend with web3 integration"
    ```
    

## 5단계: 프론트엔드 개발 (React)

1. **React 앱 생성 및 의존성 설치:**
    
    Bash
    
    ```
    # fullstack-token-dapp 디렉토리 내에서 실행
    npx create-react-app frontend
    cd frontend
    npm install ethers@6 # ethers v6 설치 명시
    ```
    
2. **`frontend/.env` 파일 생성:**
    
    - `frontend` 디렉토리에 `.env` 파일을 만들고 아래 내용을 채웁니다.
        
        코드 스니펫
        
        ```
        # 3단계에서 배포 후 기록한 컨트랙트 주소
        REACT_APP_CONTRACT_ADDRESS=0xyour_deployed_contract_address_here
        # 백엔드 서버 주소
        REACT_APP_BACKEND_URL=http://localhost:8000
        # Sepolia 네트워크 체인 ID (10진수)
        REACT_APP_CHAIN_ID=11155111
        # Sepolia 네트워크 이름 (표시용)
        REACT_APP_NETWORK_NAME=Sepolia
        ```
        
3. **`frontend/src/contracts/` 디렉토리 생성 및 ABI 파일 복사:**
    
    Bash
    
    ```
    mkdir -p src/contracts
    ```
    
    - `backend/abi.json` 파일 내용을 복사하여 `frontend/src/contracts/abi.json` 파일을 만들고 붙여넣습니다.
4. **`frontend/src/App.js` 작성 (Ethers v6 기준 최종):**
    
    JavaScript
    
    ```
    import React, { useState, useEffect, useCallback } from "react";
    // Ethers v6: 필요한 클래스/함수를 직접 임포트
    import { BrowserProvider, Contract, parseUnits, isAddress, formatUnits } from "ethers";
    import tokenABI from "./contracts/abi.json"; // ABI 임포트
    import './App.css'; // CSS 임포트
    
    // .env 값 읽기
    const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS;
    const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
    const targetNetworkId = process.env.REACT_APP_CHAIN_ID; // 문자열일 수 있음
    const targetNetworkName = process.env.REACT_APP_NETWORK_NAME || "Sepolia";
    
    function App() {
      // 상태 변수들
      const [provider, setProvider] = useState(null);
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
      }, [backendUrl]); // backendUrl 의존성 추가
    
    
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
    
    ```
    
5. **`frontend/src/App.css` 작성:** (이전 가이드의 CSS 코드 사용 또는 커스텀)
    
    CSS
    
    ```
    /* 이전 가이드에서 제공된 App.css 내용을 여기에 붙여넣으세요 */
    .App {
      text-align: center;
    }
    /* ... (나머지 스타일) ... */
    .status-pending_confirmation, .status-pending_receipt, .status-pending { color: #feca57; font-weight: bold; }
    .status-success { color: #1dd1a1; font-weight: bold; }
    .status-failed { color: #ff6b6b; font-weight: bold; }
    .status-error { color: #ff6b6b; font-weight: bold; }
    /* ... */
    ```
    
6. **프론트엔드 개발 서버 실행:**
    
    Bash
    
    ```
    # frontend 디렉토리에서 실행
    npm start
    ```
    
7. **Git 커밋:**
    
    Bash
    
    ```
    cd ..
    git add frontend/
    git commit -m "feat: Add React frontend with Ethers v6 and polling"
    ```
    

## 6단계: 전체 시스템 실행 및 테스트

1. **WSL 터미널 2개 준비:**
2. **터미널 1 - 백엔드 실행:**
    
    Bash
    
    ```
    cd ~/projects/fullstack-token-dapp/backend
    source venv/bin/activate
    uvicorn main:app --reload --host 0.0.0.0 --port 8000
    ```
    
    - 백엔드 터미널에 오류 없이 `Uvicorn running...` 메시지가 뜨는지 확인합니다.
3. **터미널 2 - 프론트엔드 실행:**
    
    Bash
    
    ```
    cd ~/projects/fullstack-token-dapp/frontend
    npm start
    ```
    
4. **웹 브라우저 열기:** Windows 웹 브라우저에서 `http://localhost:3000` 주소로 접속합니다.
5. **테스트:**
    - **오류 해결:** `Error: Please connect to the Sepolia Test Network...` 오류 발생 시, MetaMask를 열어 네트워크를 **Sepolia**로 변경합니다.
    - "Connect MetaMask" 버튼 클릭 및 지갑 연결 승인.
    - 주소, Decimals가 잘 표시되는지 확인.
    - 받는 주소와 수량 입력 후 "Send Tokens" 클릭.
    - MetaMask 트랜잭션 확인 및 승인.
    - UI에 Tx Hash와 상태 변화(Confirming -> Pending Receipt -> Pending(Checking) -> Success/Failed)가 올바르게 표시되는지 확인합니다.
    - **오류 해결:** `Error: Failed to fetch transaction status from backend.` 또는 `SyntaxError: Unexpected token '<'...` 오류 발생 시, **백엔드 터미널 로그**를 최우선으로 확인하여 백엔드 측의 오류(RPC 연결, Web3 오류 등)가 있는지 찾아 해결합니다. 브라우저 개발자 콘솔(F12)의 Network 탭과 Console 탭 정보도 확인합니다.
    - 성공 시 Etherscan 링크를 클릭하여 실제 트랜잭션 확인.

## 결론

이 가이드를 통해 WSL 환경에서 Foundry, FastAPI, React를 사용하는 풀스택 dApp 개발의 전체 흐름과 주요 단계별 코드, 그리고 발생했던 오류들의 해결 과정을 종합적으로 다루었습니다. 각 단계를 차근차근 따라 하면서 실제 동작을 확인하고, 문제가 발생했을 때 제시된 해결 방법을 참고하여 성공적으로 프로젝트를 완성하시기를 바랍니다.