from datetime import datetime, timedelta
from typing import Optional
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.core.config import settings

# 密码加密上下文
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
	"""创建JWT访问令牌"""
	to_encode = data.copy()
	if expires_delta:
		expire = datetime.utcnow() + expires_delta
	else:
		expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
	
	to_encode.update({"exp": expire})
	return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def verify_token(token: str) -> Optional[str]:
	"""验证JWT令牌并返回用户名"""
	try:
		payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
		username: str = payload.get("sub")
		return username
	except JWTError:
		return None


def hash_password(password: str) -> str:
	"""哈希密码"""
	return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
	"""验证密码"""
	return pwd_context.verify(plain_password, hashed_password)