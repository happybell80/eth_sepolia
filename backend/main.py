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