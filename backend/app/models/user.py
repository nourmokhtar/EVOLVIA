from datetime import datetime
from typing import Optional, Dict, List
from uuid import uuid4
from sqlmodel import Field, SQLModel, Column, JSON

class User(SQLModel, table=True):
    __tablename__ = "users"
    
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    email: str = Field(index=True, unique=True, nullable=False)
    hashed_password: str = Field(nullable=False)
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    personality_profile: Dict = Field(default={}, sa_column=Column(JSON))
    learning_goals: List[str] = Field(default=[], sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# /*************  ✨ Windsurf Command ⭐  *************/
#     class Config:
#         database_url: str

#     @classmethod
#     def parse_obj(cls, obj: Dict) -> "Config":
#         return cls(
#             database_url=obj["database_url"],
#         )

#     @classmethod
#     async def get_config(cls) -> "Config":
#         config_data = await query_table("config", {"key": "database_url"})
#         if not config_data:
#             raise HTTPException(status_code=404, detail="Config not found")
#         return cls.parse_obj(config_data[0])

#     @classmethod
#     async def get_database(cls) -> "Supabase":
#         config = await cls.get_config()
#         return await get_supabase(config.database_url)
# /*******  8ad598f6-2661-4445-a62a-00ebf76cb5bf  *******/