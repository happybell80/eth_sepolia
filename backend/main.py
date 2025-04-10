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
    "http://localhost:3001", # React 개발 서버
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