from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_active_user
from app.schemas.user import UserCreate, UserOut, LoginRequest, LoginResponse, Token
from app.services.user_service import UserService
from app.services.auth_service import AuthService
from app.models.user import User
import traceback

router = APIRouter()


@router.post(
	"/register",
	response_model=UserOut,
	status_code=status.HTTP_201_CREATED,
	summary="用户注册",
	description="使用用户名、邮箱和密码注册新用户"
	)
def register(user_create: UserCreate, db: Session = Depends(get_db)):
	"""
	用户注册端点

	- **username**: 用户名（唯一）
	- **email**: 邮箱地址（唯一）
	- **password**: 密码
	"""
	# 检查用户名是否已存在
	if UserService.get_user_by_username(db, user_create.username):
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Username already registered"
			)
	
	# 检查邮箱是否已存在
	if UserService.get_user_by_email(db, user_create.email):
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Email already registered"
			)
	
	try:
		user = UserService.create_user(db, user_create)
		return user
	except Exception as e:
		raise HTTPException(
			status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
			detail="Failed to create user"
			)


@router.post(
	"/login",
	response_model=LoginResponse,
	summary="用户登录",
	description="使用用户名和密码登录，返回JWT令牌"
	)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
	"""
	用户登录端点
	"""
	try:
		print(f"收到登录请求: {login_data}")  # 调试输出
		
		# 检查数据库连接
		if not db:
			print("数据库连接失败")
			raise HTTPException(status_code=500, detail="数据库连接失败")
		
		print("开始调用 AuthService.login")
		login_response = AuthService.login(db, login_data)
		print(f"AuthService.login 返回: {login_response}")
		
		if not login_response:
			raise HTTPException(
				status_code=status.HTTP_401_UNAUTHORIZED,
				detail="Incorrect username or password",
				headers={"WWW-Authenticate": "Bearer"},
				)
		
		return login_response
	
	except HTTPException:
		# 重新抛出HTTP异常
		raise
	except Exception as e:
		# 捕获所有其他异常
		print(f"登录过程中发生异常: {str(e)}")
		print(f"异常详情: {traceback.format_exc()}")
		raise HTTPException(
			status_code=500,
			detail=f"服务器内部错误: {str(e)}"
			)

@router.get(
	"/me",
	response_model=UserOut,
	summary="获取当前用户信息",
	description="获取当前登录用户的详细信息"
	)
def get_current_user_info(
		current_user: User = Depends(get_current_active_user)
		):
	"""
	获取当前用户信息端点

	需要在请求头中包含有效的JWT令牌：
	Authorization: Bearer <token>
	"""
	return current_user


@router.post(
	"/refresh",
	response_model=Token,
	summary="刷新令牌",
	description="使用当前令牌获取新的访问令牌"
	)
def refresh_access_token(
		current_user: User = Depends(get_current_active_user)
		):
	"""
	刷新访问令牌端点

	返回新的JWT令牌
	"""
	new_token = AuthService.refresh_token(None, current_user)
	return Token(access_token=new_token, token_type="bearer")