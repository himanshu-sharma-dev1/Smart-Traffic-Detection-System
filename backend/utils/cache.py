"""
Redis Cache Utilities for Smart Traffic Detection
Provides caching for repeated detections and session management
"""
import hashlib
import json
import os
from typing import Optional, Any
from datetime import timedelta

# Check if redis is available
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False


class CacheManager:
    """
    Manages caching for detection results and sessions
    Falls back to in-memory cache if Redis is not available
    """
    
    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None
        self.memory_cache: dict = {}
        self._connect()
    
    def _connect(self):
        """Connect to Redis if available"""
        if not REDIS_AVAILABLE:
            print("⚠️ Redis not installed, using in-memory cache")
            return
        
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        
        try:
            self.redis_client = redis.from_url(redis_url, decode_responses=True)
            self.redis_client.ping()
            print("✅ Connected to Redis cache")
        except Exception as e:
            print(f"⚠️ Redis connection failed: {e}, using in-memory cache")
            self.redis_client = None
    
    def _hash_image(self, image_bytes: bytes) -> str:
        """Create hash of image for cache key"""
        return hashlib.md5(image_bytes).hexdigest()
    
    async def get_cached_detection(self, image_bytes: bytes) -> Optional[dict]:
        """
        Get cached detection result for an image
        
        Args:
            image_bytes: Raw image bytes
            
        Returns:
            Cached detection result or None
        """
        cache_key = f"detection:{self._hash_image(image_bytes)}"
        
        if self.redis_client:
            try:
                cached = self.redis_client.get(cache_key)
                if cached:
                    return json.loads(cached)
            except Exception:
                pass
        else:
            # Fallback to memory cache
            if cache_key in self.memory_cache:
                return self.memory_cache[cache_key]
        
        return None
    
    async def cache_detection(
        self, 
        image_bytes: bytes, 
        result: dict, 
        expire_seconds: int = 3600
    ):
        """
        Cache detection result for an image
        
        Args:
            image_bytes: Raw image bytes
            result: Detection result to cache
            expire_seconds: Cache expiration time (default 1 hour)
        """
        cache_key = f"detection:{self._hash_image(image_bytes)}"
        
        if self.redis_client:
            try:
                self.redis_client.setex(
                    cache_key, 
                    expire_seconds, 
                    json.dumps(result)
                )
            except Exception:
                pass
        else:
            # Fallback to memory cache (with size limit)
            if len(self.memory_cache) > 100:
                # Clear oldest entries
                self.memory_cache.clear()
            self.memory_cache[cache_key] = result
    
    async def get_session(self, session_id: str) -> Optional[dict]:
        """Get cached session data"""
        cache_key = f"session:{session_id}"
        
        if self.redis_client:
            try:
                cached = self.redis_client.get(cache_key)
                if cached:
                    return json.loads(cached)
            except Exception:
                pass
        else:
            if cache_key in self.memory_cache:
                return self.memory_cache[cache_key]
        
        return None
    
    async def set_session(
        self, 
        session_id: str, 
        data: dict, 
        expire_seconds: int = 86400
    ):
        """Cache session data (default 24 hours)"""
        cache_key = f"session:{session_id}"
        
        if self.redis_client:
            try:
                self.redis_client.setex(
                    cache_key, 
                    expire_seconds, 
                    json.dumps(data)
                )
            except Exception:
                pass
        else:
            self.memory_cache[cache_key] = data
    
    async def invalidate_session(self, session_id: str):
        """Remove session from cache"""
        cache_key = f"session:{session_id}"
        
        if self.redis_client:
            try:
                self.redis_client.delete(cache_key)
            except Exception:
                pass
        else:
            self.memory_cache.pop(cache_key, None)
    
    async def increment_rate_limit(
        self, 
        key: str, 
        limit: int = 100, 
        window_seconds: int = 60
    ) -> tuple[int, bool]:
        """
        Increment rate limit counter
        
        Returns:
            tuple of (current_count, is_allowed)
        """
        cache_key = f"ratelimit:{key}"
        
        if self.redis_client:
            try:
                current = self.redis_client.incr(cache_key)
                if current == 1:
                    self.redis_client.expire(cache_key, window_seconds)
                return current, current <= limit
            except Exception:
                return 0, True
        else:
            # Simple memory-based rate limiting
            current = self.memory_cache.get(cache_key, 0) + 1
            self.memory_cache[cache_key] = current
            return current, current <= limit
    
    def get_stats(self) -> dict:
        """Get cache statistics"""
        if self.redis_client:
            try:
                info = self.redis_client.info()
                return {
                    "backend": "redis",
                    "connected": True,
                    "used_memory": info.get("used_memory_human", "unknown"),
                    "total_keys": self.redis_client.dbsize()
                }
            except Exception:
                pass
        
        return {
            "backend": "memory",
            "connected": False,
            "total_keys": len(self.memory_cache)
        }


# Singleton instance
_cache_manager: Optional[CacheManager] = None


def get_cache_manager() -> CacheManager:
    """Get the cache manager singleton"""
    global _cache_manager
    if _cache_manager is None:
        _cache_manager = CacheManager()
    return _cache_manager


# Usage example in detection endpoint:
"""
from utils.cache import get_cache_manager

@app.post("/detect")
async def detect_objects(file: UploadFile):
    cache = get_cache_manager()
    
    contents = await file.read()
    
    # Check cache first
    cached_result = await cache.get_cached_detection(contents)
    if cached_result:
        return {**cached_result, "cached": True}
    
    # Run detection
    result = await run_detection(contents)
    
    # Cache the result
    await cache.cache_detection(contents, result)
    
    return result
"""
