/**
 * TypeScript 타입 정의 캐싱 시스템
 * 브라우저 로컬 스토리지를 활용하여 다운로드한 타입 정의를 캐시하고
 * 재방문 시 빠른 로딩을 제공합니다.
 */

interface CachedTypeInfo {
  content: string;
  timestamp: number;
  version?: string;
  etag?: string;
}

interface TypeCacheStats {
  totalTypes: number;
  cacheSize: string;
  hitRate: number;
  missCount: number;
  hitCount: number;
}

export class TypeCache {
  private static readonly CACHE_PREFIX = "ts-types-cache:";
  private static readonly CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24시간
  private static readonly MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB

  private hitCount = 0;
  private missCount = 0;

  /**
   * 캐시에서 타입 정의 조회
   */
  async get(moduleUrl: string): Promise<string | null> {
    try {
      const cacheKey = this.getCacheKey(moduleUrl);
      const cached = localStorage.getItem(cacheKey);

      if (!cached) {
        this.missCount++;
        return null;
      }

      const parsedCache: CachedTypeInfo = JSON.parse(cached);

      // 캐시 만료 확인
      if (Date.now() - parsedCache.timestamp > TypeCache.CACHE_EXPIRY) {
        localStorage.removeItem(cacheKey);
        this.missCount++;
        return null;
      }

      // ETag 기반 검증 (선택적)
      if (parsedCache.etag) {
        const isValid = await this.validateETag(moduleUrl, parsedCache.etag);
        if (!isValid) {
          localStorage.removeItem(cacheKey);
          this.missCount++;
          return null;
        }
      }

      this.hitCount++;
      console.log(`🎯 Cache hit for: ${moduleUrl}`);
      return parsedCache.content;
    } catch (error) {
      console.warn(`Cache read error for ${moduleUrl}:`, error);
      this.missCount++;
      return null;
    }
  }

  /**
   * 타입 정의를 캐시에 저장
   */
  async set(
    moduleUrl: string,
    content: string,
    options?: { etag?: string; version?: string }
  ): Promise<void> {
    try {
      // 캐시 크기 확인 및 정리
      await this.ensureCacheSpace();

      const cacheKey = this.getCacheKey(moduleUrl);
      const cacheInfo: CachedTypeInfo = {
        content,
        timestamp: Date.now(),
        version: options?.version,
        etag: options?.etag,
      };

      localStorage.setItem(cacheKey, JSON.stringify(cacheInfo));
      console.log(
        `💾 Cached types for: ${moduleUrl} (${this.formatSize(content.length)})`
      );
    } catch (error) {
      console.warn(`Cache write error for ${moduleUrl}:`, error);
    }
  }

  /**
   * 특정 모듈의 캐시 삭제
   */
  remove(moduleUrl: string): void {
    const cacheKey = this.getCacheKey(moduleUrl);
    localStorage.removeItem(cacheKey);
  }

  /**
   * 전체 타입 캐시 삭제
   */
  clear(): void {
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(TypeCache.CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
    console.log(`🗑️ Cleared ${keysToRemove.length} cached type definitions`);
  }

  /**
   * 캐시 통계 조회
   */
  getStats(): TypeCacheStats {
    let totalTypes = 0;
    let totalSize = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(TypeCache.CACHE_PREFIX)) {
        totalTypes++;
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      }
    }

    const totalRequests = this.hitCount + this.missCount;
    const hitRate =
      totalRequests > 0 ? (this.hitCount / totalRequests) * 100 : 0;

    return {
      totalTypes,
      cacheSize: this.formatSize(totalSize),
      hitRate: Math.round(hitRate * 100) / 100,
      hitCount: this.hitCount,
      missCount: this.missCount,
    };
  }

  /**
   * 캐시 공간 확보
   */
  private async ensureCacheSpace(): Promise<void> {
    const currentSize = this.getCurrentCacheSize();

    if (currentSize > TypeCache.MAX_CACHE_SIZE) {
      console.log("🧹 Cache size exceeded, cleaning up old entries...");
      await this.cleanupOldEntries();
    }
  }

  /**
   * 오래된 캐시 항목 정리
   */
  private async cleanupOldEntries(): Promise<void> {
    const entries: Array<{ key: string; timestamp: number }> = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(TypeCache.CACHE_PREFIX)) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            const parsed: CachedTypeInfo = JSON.parse(value);
            entries.push({ key, timestamp: parsed.timestamp });
          }
        } catch (error) {
          // 파싱 오류가 있는 항목은 삭제
          console.error(`Error parsing cache entry ${key}:`, error);
          localStorage.removeItem(key);
        }
      }
    }

    // 타임스탬프 기준으로 정렬하고 오래된 항목부터 삭제
    entries.sort((a, b) => a.timestamp - b.timestamp);
    const toRemove = Math.ceil(entries.length * 0.3); // 30% 삭제

    for (let i = 0; i < toRemove; i++) {
      localStorage.removeItem(entries[i].key);
    }

    console.log(`🧹 Cleaned up ${toRemove} old cache entries`);
  }

  /**
   * 현재 캐시 크기 계산
   */
  private getCurrentCacheSize(): number {
    let totalSize = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(TypeCache.CACHE_PREFIX)) {
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      }
    }

    return totalSize;
  }

  /**
   * ETag를 이용한 캐시 검증
   */
  private async validateETag(
    url: string,
    cachedETag: string
  ): Promise<boolean> {
    try {
      const response = await fetch(url, { method: "HEAD" });
      const currentETag = response.headers.get("etag");
      return currentETag === cachedETag;
    } catch (error) {
      // 네트워크 오류 시 캐시를 유효한 것으로 간주
      console.warn("ETag validation failed:", error);
      return true;
    }
  }

  /**
   * URL을 캐시 키로 변환
   */
  private getCacheKey(url: string): string {
    // URL을 안전한 캐시 키로 변환
    const safePath = url.replace(/[^a-zA-Z0-9]/g, "_");
    return `${TypeCache.CACHE_PREFIX}${safePath}`;
  }

  /**
   * 바이트 크기를 읽기 쉬운 형태로 변환
   */
  private formatSize(bytes: number): string {
    const sizes = ["Bytes", "KB", "MB", "GB"];
    if (bytes === 0) return "0 Bytes";

    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = bytes / Math.pow(1024, i);

    return `${Math.round(size * 100) / 100} ${sizes[i]}`;
  }
}

// 전역 캐시 인스턴스
export const globalTypeCache = new TypeCache();
