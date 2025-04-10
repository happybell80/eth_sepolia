WSL(Ubuntu) 환경에서 전체 "토큰 전송 및 조회 시스템" 예제를 처음부터 끝까지 설정하고 실행하는 과정을 하나의 가이드로 통합하여 설명드리겠습니다. 이전 오류들을 고려하여 관련 주의사항을 포함했습니다.

**목표:** WSL(Ubuntu) 환경에서 Foundry, FastAPI, React를 사용하여 Sepolia 테스트넷 기반의 간단한 ERC-20 토큰 전송 및 조회 dApp을 구축합니다.

**환경:** Windows 11 + WSL (Ubuntu 배포판)

---

### 1단계: WSL 및 필수 개발 도구 설치

**주의:** 모든 명령어는 **WSL/Ubuntu 터미널**에서 실행합니다.

1. **WSL 및 Ubuntu 설치:**
    
    - PowerShell (관리자 권한)에서 `wsl --install` 실행 또는 Microsoft Store에서 Ubuntu 설치. ([Microsoft WSL 설치 가이드](https://learn.microsoft.com/ko-kr/windows/wsl/install) 참조)
    - Ubuntu 실행 및 초기 사용자 설정(사용자명, 암호) 완료.
2. **Ubuntu 시스템 업데이트 및 기본 도구 설치:**
    
    Bash
    
    ```
    sudo apt update && sudo apt upgrade -y
    sudo apt install -y curl git build-essential
    ```
    
3. **Git 전역 설정:**
    
    Bash
    
    ```
    git config --global user.name "Your Name"
    git config --global user.email "you@example.com"
    ```
    
4. **Python 설치 (Python3, pip, venv):**
    
    Bash
    
    ```
    sudo apt install -y python3-pip python3-venv
    python3 --version
    pip3 --version
    ```
    
5. **Node.js 설치 (NVM 사용 권장):**
    
    Bash
    
    ```
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    # 터미널 재시작 또는 아래 명령어 실행
    export NVM_DIR="$HOME/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"; [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
    nvm install --lts # 최신 LTS 버전 설치
    node -v
    npm -v
    ```
    
6. **Foundry 설치:**
    
    Bash
    
    ```
    curl -L https://foundry.paradigm.xyz | bash
    # 터미널 재시작 또는 환경변수 로드 (위 NVM 로드 명령어와 유사)
    source ~/.bashrc # 또는 .profile / .zshrc 등 사용 셸에 맞게
    foundryup # 최신 바이너리 설치
    forge --version # 설치 확인
    ```
    
7. **MetaMask, Sepolia ETH, Infura/Alchemy 준비:**
    
    - **MetaMask:** 브라우저에 설치하고 계정 생성/가져오기. Sepolia 테스트넷 네트워크 추가. **개인 키**를 안전하게 백업.
    - **Sepolia 테스트 ETH:** [Sepolia Faucet](https://sepoliafaucet.com/) 등에서 테스트용 ETH 받기 (배포 및 전송 수수료 필요).
    - **Infura 또는 Alchemy API 키:**
        - [Infura](https://infura.io) 또는 [Alchemy](https://alchemy.com) 가입.
        - 새 프로젝트/앱 생성 (Ethereum 체인, **Sepolia** 네트워크 선택).
        - 생성된 **HTTPS URL** (예: `https://sepolia.infura.io/v3/YOUR_API_KEY`)을 복사. 이것이 RPC URL입니다. **이 URL을 비밀로 유지하세요.**

---

### 2단계: 프로젝트 구조 생성 및 Git 초기화

Bash

```
# 프로젝트를 생성할 디렉토리로 이동 (예: 홈 디렉토리 아래)
mkdir -p ~/projects/fullstack-token-dapp
cd ~/projects/fullstack-token-dapp

# Git 저장소 초기화
git init

# .gitignore 파일 생성 (초기 버전)
echo ".env" > .gitignore
echo "*.log" >> .gitignore
echo "__pycache__/" >> .gitignore
echo "node_modules/" >> .gitignore
echo "venv/" >> .gitignore
echo "out/" >> .gitignore # Foundry 컴파일 결과
echo "cache/" >> .gitignore # Foundry 캐시
echo "broadcast/" >> .gitignore # Foundry 배포 로그

git add .gitignore
git commit -m "Initial commit with .gitignore"
```

---

### 3단계: 스마트 컨트랙트 개발 및 배포 (Foundry)

1. **Foundry 프로젝트 초기화:**
    
    Bash
    
    ```
    # fullstack-token-dapp 디렉토리 내에서 실행
    forge init token_project --force # 필요시 --force 사용
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
    pragma solidity ^0.8.20; // 버전 명시 권장
    
    import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
    import "@openzeppelin/contracts/access/Ownable.sol"; // 선택: 초기 발행 제어
    
    contract MyToken is ERC20, Ownable {
        constructor(address initialOwner) ERC20("MyToken", "MTK") Ownable(initialOwner) {
            _mint(initialOwner, 1000000 * 10 ** decimals()); // 1,000,000 토큰 발행
        }
    
        // 필요시 추가 함수 구현 (예: 추가 발행 등)
        function mint(address to, uint256 amount) public onlyOwner {
            _mint(to, amount);
        }
    }
    ```
    
    - `Ownable`을 추가하여 발행자(배포자)를 명시적으로 지정했습니다.
4. **`script/Deploy.s.sol` 작성:**
    
    Solidity
    
    ```
    // SPDX-License-Identifier: MIT
    pragma solidity ^0.8.20;
    
    import { Script, console } from "forge-std/Script.sol";
    import { MyToken } from "../src/Token.sol";
    
    contract Deploy is Script {
        function run() external returns (MyToken) {
            uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY"); // .env 에서 읽기
            address initialOwner = vm.addr(deployerPrivateKey); // 개인키로부터 주소 얻기
    
            vm.startBroadcast(deployerPrivateKey); // 개인키로 브로드캐스트 시작
    
            console.log("Deploying MyToken with initial owner:", initialOwner);
            MyToken token = new MyToken(initialOwner); // 생성자에 배포자 주소 전달
    
            vm.stopBroadcast();
            console.log("MyToken deployed to:", address(token));
            return token;
        }
    }
    ```
    
    - 스크립트가 배포된 컨트랙트 주소를 반환하고 로그를 남기도록 수정했습니다.
    - `.env`에서 직접 개인 키를 읽어와 사용합니다 (`vm.envUint`).
5. **`token_project/.env` 파일 생성:**
    
    - `token_project` 디렉토리에 `.env` 파일을 만듭니다.
    - 아래 내용을 넣고, 실제 값으로 변경합니다. **따옴표나 공백 없이** `키=값` 형태로 작성합니다.
        
        코드 스니펫
        
        ```
        # MetaMask 계정의 개인키 (0x 포함, 66자)
        PRIVATE_KEY=0xyour_metamask_private_key_here
        # Infura/Alchemy에서 발급받은 Sepolia HTTPS URL
        RPC_URL=https://sepolia.infura.io/v3/your_api_key_here
        # 선택: Etherscan API 키 (코드 검증용)
        # ETHERSCAN_API_KEY=your_etherscan_api_key_here
        ```
        
6. **`foundry.toml` 확인 및 수정:**
    
    - `token_project/foundry.toml` 파일을 엽니다.
    - **중요:** Sepolia에 직접 배포할 것이므로, 불필요한 `fork_url` 설정이 없는지 확인합니다. 파일 내용이 복잡하다면, 최소한 아래 내용만 남기거나 유사하게 수정합니다. (`[profile.default]` 아래 `fork_url` 같은 줄이 있다면 삭제하거나 주석 처리 `#` 하세요.)
        
        Ini, TOML
        
        ```
        [profile.default]
        src = "src"
        out = "out"
        libs = ["lib"]
        # 아래는 예시, 불필요한 fork 설정은 제거
        # fork_url = "..." # <- 이런 줄 제거 또는 주석 처리
        
        # 선택: Etherscan 검증 설정
        [etherscan]
        sepolia = { key = "${ETHERSCAN_API_KEY}" } # .env에서 키 읽어오기
        
        [rpc_endpoints]
        sepolia = "${RPC_URL}" # .env에서 URL 읽어오기
        ```
        
    - `[rpc_endpoints]`와 `[etherscan]` 섹션을 추가하면 배포 명령어에서 `--rpc-url`이나 API 키를 명시하지 않아도 될 수 있습니다.
7. **컨트랙트 컴파일:**
    
    Bash
    
    ```
    forge build
    ```
    
    - 오류 없이 컴파일되는지 확인합니다.
8. **컨트랙트 배포:**
    
    - `token_project` 디렉토리에서 실행합니다.
    
    Bash
    
    ```
    # 방법 1: .env와 foundry.toml 설정을 사용하는 경우 (권장)
    # (foundry.toml에 sepolia 엔드포인트와 etherscan 키가 설정되어 있어야 함)
    forge script script/Deploy.s.sol:Deploy --rpc-url sepolia --broadcast --verify
    
    # 방법 2: 환경 변수를 직접 명시하는 경우 (오류 발생 시 시도)
    # forge script script/Deploy.s.sol:Deploy --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast --verify -vvvv
    ```
    
    - 배포 성공 시 터미널에 `MyToken deployed to: 0x...` 와 같이 **컨트랙트 주소**가 출력됩니다. **이 주소를 복사하여 잘 보관하세요.**
9. **Git 커밋:**
    
    Bash
    
    ```
    # .gitignore 에 out/, cache/, broadcast/ 추가되었는지 확인
    echo "out/" >> ../.gitignore
    echo "cache/" >> ../.gitignore
    echo "broadcast/" >> ../.gitignore
    
    cd .. # 상위 디렉토리로 이동
    git add .gitignore token_project/
    git commit -m "feat: Add ERC20 token contract and deployment script"
    ```
    

---

### 4단계: 백엔드 개발 (FastAPI)

1. **디렉토리 생성 및 가상 환경 설정:**
    
    Bash
    
    ```
    # fullstack-token-dapp 디렉토리 내에서 실행
    mkdir backend
    cd backend
    python3 -m venv venv
    source venv/bin/activate # 가상환경 활성화
    ```
    
2. **의존성 설치:**
    
    Bash
    
    ```
    pip install fastapi uvicorn web3 python-dotenv websockets # websockets는 uvicorn에 필요할 수 있음
    ```
    
3. **`backend/.env` 파일 생성:**
    
    - `backend` 디렉토리에 `.env` 파일을 만듭니다.
    - 아래 내용을 넣고 실제 값으로 변경합니다.
        
        코드 스니펫
        
        ```
        RPC_URL=https://sepolia.infura.io/v3/your_api_key_here
        # 3단계에서 배포된 컨트랙트 주소
        CONTRACT_ADDRESS=0xyour_deployed_contract_address_here
        ```
        
4. **`backend/abi.json` 파일 생성:**
    
    - `token_project/out/Token.sol/MyToken.json` 파일을 엽니다.
    - 파일 내용 중 `"abi": [...]` 부분의 **대괄호 `[` 로 시작해서 `]` 로 끝나는 배열 전체**를 복사합니다.
    - `backend/abi.json` 파일을 새로 만들고, 복사한 ABI 배열 내용을 붙여넣습니다.
5. **`backend/main.py` 작성:**
    
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
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
    logger = logging.getLogger(__name__)
    
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
    
    if not rpc_url or not contract_address:
        logger.error("RPC_URL or CONTRACT_ADDRESS missing in .env")
        raise ValueError("RPC_URL and CONTRACT_ADDRESS must be set")
    
    w3 = Web3(Web3.HTTPProvider(rpc_url))
    checksum_address = Web3.to_checksum_address(contract_address)
    
    try:
        with open("abi.json") as f:
            abi = json.load(f)
    except Exception as e:
        logger.error(f"Failed to load abi.json: {e}")
        raise
    
    contract = w3.eth.contract(address=checksum_address, abi=abi)
    logger.info(f"Connected to RPC: {rpc_url}")
    logger.info(f"Contract address set to: {checksum_address}")
    
    @app.get("/")
    def read_root():
        return {"message": "Token Transfer Backend Running"}
    
    @app.get("/tx_status/{tx_hash}")
    async def get_tx_status(tx_hash: str):
        logger.info(f"Checking status for tx: {tx_hash}")
        try:
            receipt = w3.eth.get_transaction_receipt(tx_hash)
            if receipt is None:
                return {"status": "pending"}
            elif receipt.status == 1:
                return {"status": "success"}
            else:
                return {"status": "failed"}
        except Exception as e:
            logger.error(f"Error checking tx {tx_hash}: {e}")
            return {"status": "error", "message": str(e)}
    
    # 서버 시작 확인용 로그
    logger.info("FastAPI application startup complete.")
    
    ```
    
6. **백엔드 서버 실행:**
    
    Bash
    
    ```
    # backend 디렉토리, 가상환경 활성화 상태에서 실행
    uvicorn main:app --reload --host 0.0.0.0 --port 8000
    ```
    
    - 브라우저에서 `http://localhost:8000` 접속 시 `{"message":"Token Transfer Backend Running"}`이 나오는지 확인.
7. **Git 커밋:**
    
    Bash
    
    ```
    deactivate # 가상환경 비활성화 (선택사항)
    cd ..
    # .gitignore 에 backend/venv/ 추가되었는지 확인
    echo "backend/venv/" >> .gitignore
    git add backend/ .gitignore
    git commit -m "feat: Add FastAPI backend"
    ```
    

---

### 5단계: 프론트엔드 개발 (React)

1. **React 앱 생성 및 의존성 설치:**
    
    Bash
    
    ```
    # fullstack-token-dapp 디렉토리 내에서 실행
    npx create-react-app frontend
    cd frontend
    npm install ethers
    ```
    
2. **`frontend/.env` 파일 생성:**
    
    - `frontend` 디렉토리에 `.env` 파일을 만듭니다.
    - 아래 내용을 넣고 실제 값으로 변경합니다.
        
        코드 스니펫
        
        ```
        # 3단계에서 배포된 컨트랙트 주소
        REACT_APP_CONTRACT_ADDRESS=0xyour_deployed_contract_address_here
        # 백엔드 서버 주소
        REACT_APP_BACKEND_URL=http://localhost:8000
        # Sepolia 네트워크 체인 ID (10진수)
        REACT_APP_CHAIN_ID=11155111
        # Sepolia 네트워크 이름 (표시용)
        REACT_APP_NETWORK_NAME=Sepolia
        ```
        
        - (선택사항) `REACT_APP_SEPOLIA_RPC_URL`을 추가하여 프론트엔드에서 직접 읽기 작업을 수행할 수도 있습니다.
3. **`frontend/src/contracts/` 디렉토리 생성 및 ABI 파일 복사:**
    
    Bash
    
    ```
    mkdir -p src/contracts
    ```
    
    - `backend/abi.json` 파일의 내용을 복사하여 `frontend/src/contracts/abi.json` 파일을 만들고 붙여넣습니다.
4. **`frontend/src/App.js` 작성:** (이전 가이드의 개선된 App.js 코드 사용 - 지갑 연결, 상태 폴링, 오류 처리 등 포함)
    
    - 코드가 길어서 여기에 다시 넣지는 않겠습니다. 이전 답변의 `App.js` 코드를 참조하여 작성하세요.
    - **중요:** `App.js` 코드 내에서 환경 변수(`.env` 파일 값)를 `process.env.REACT_APP_...` 형태로 올바르게 참조하는지 확인하세요. 특히 `REACT_APP_CONTRACT_ADDRESS`와 `REACT_APP_BACKEND_URL`.
    - 체인 ID 확인 로직 (`if (chainId !== parseInt(process.env.REACT_APP_CHAIN_ID))`)을 추가하여 사용자가 올바른 네트워크(Sepolia)에 연결하도록 유도하는 것이 좋습니다.
5. **`frontend/src/App.css` 작성:** (이전 가이드의 App.css 코드 사용 또는 원하는 대로 스타일링)
    
6. **프론트엔드 개발 서버 실행:**
    
    Bash
    
    ```
    # frontend 디렉토리에서 실행
    npm start
    ```
    
    - 브라우저에서 `http://localhost:3000` 자동으로 열립니다.
7. **Git 커밋:**
    
    Bash
    
    ```
    cd ..
    # .gitignore 에 frontend/node_modules/ 추가되었는지 확인 (create-react-app이 자동 추가)
    echo "frontend/node_modules/" >> .gitignore
    git add frontend/ .gitignore
    git commit -m "feat: Add React frontend"
    ```
    

---

### 6단계: 전체 시스템 실행 및 테스트

1. **터미널 2개 준비:** WSL/Ubuntu 터미널을 두 개 엽니다.
2. **터미널 1 - 백엔드 실행:**
    
    Bash
    
    ```
    cd ~/projects/fullstack-token-dapp/backend
    source venv/bin/activate
    uvicorn main:app --reload --host 0.0.0.0 --port 8000
    ```
    
3. **터미널 2 - 프론트엔드 실행:**
    
    Bash
    
    ```
    cd ~/projects/fullstack-token-dapp/frontend
    npm start
    ```
    
4. **웹 브라우저 열기:** Windows의 웹 브라우저에서 `http://localhost:3000` 주소로 접속합니다.
5. **테스트:**
    - MetaMask 지갑을 **Sepolia 테스트넷**으로 연결합니다. (컨트랙트 배포 시 사용한 계정 또는 다른 Sepolia 계정)
    - React 앱에서 "Connect MetaMask" 버튼을 클릭하여 지갑을 연결합니다.
    - 연결된 계정 주소가 표시되는지 확인합니다.
    - 토큰을 받을 다른 Sepolia 계정 주소와 보낼 토큰 수량을 입력합니다.
    - "Send Tokens" 버튼을 클릭합니다.
    - MetaMask 팝업에서 트랜잭션을 확인하고 승인(Confirm)합니다.
    - React 앱 UI에 트랜잭션 해시(Tx Hash)와 상태(Status)가 표시되고, 주기적으로 업데이트되는지 확인합니다 (Pending -> Success/Failed).
    - 트랜잭션 해시 링크를 클릭하여 Sepolia Etherscan에서 실제 트랜잭션이 기록되었는지 확인합니다.
    - 터미널 1(백엔드 로그)과 브라우저 개발자 콘솔(F12)에 오류 메시지가 없는지 확인합니다.

---

이제 WSL/Ubuntu 환경에서 전체 풀스택 dApp 개발 과정을 처음부터 끝까지 진행할 수 있습니다. 각 단계별로 명령어를 정확히 입력하고, 특히 `.env` 파일 설정과 컨트랙트 주소 복사/붙여넣기에 주의하세요.