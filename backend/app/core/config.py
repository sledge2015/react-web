from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
	# 应用基础配置
	app_name: str = "User Auth & Admin API"
	app_version: str = "1.0.0"
	debug: bool = False
	
	# 数据库配置
	database_url: str
	database_echo: bool = False
	
	# JWT 安全配置
	secret_key: str
	algorithm: str = "HS256"
	access_token_expire_minutes: int = 60
	
	# API 配置 (这些通常不需要在 .env 中配置)
	api_v1_str: str = "/api/v1"
	docs_url: Optional[str] = "/docs"  # 生产环境可设为 None 禁用文档
	redoc_url: Optional[str] = "/redoc"
	openapi_url: Optional[str] = "/openapi.json"
	
	# 服务器配置
	host: str = "0.0.0.0"
	port: int = 8000
	reload: bool = False  # 生产环境默认关闭热重载
	
	class Config:
		env_file = ".env"
		case_sensitive = False  # 环境变量不区分大小写
	
	def __init__(self, **kwargs):
		super().__init__(**kwargs)
		# 生产环境安全检查
		if not self.debug and self.secret_key == "your-default-secret-key":
			raise ValueError("Production environment must use a secure SECRET_KEY")


# 创建全局配置实例
settings = Settings()