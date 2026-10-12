//
//  CacheManager.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  In-memory cache with TTL matching web apps/frontend/src/lib/api/cache.ts
//

import Foundation

public final class CacheManager {
    public static let shared = CacheManager()
    
    private struct CacheEntry {
        let value: Any
        let expiry: Date
    }
    
    private var cache = [String: CacheEntry]()
    private let lock = NSLock()
    
    private init() {}
    
    public func get<T>(forKey key: String) -> T? {
        lock.lock()
        defer { lock.unlock() }
        
        guard let entry = cache[key] else { return nil }
        if Date() > entry.expiry {
            cache.removeValue(forKey: key)
            return nil
        }
        return entry.value as? T
    }
    
    public func set<T>(_ value: T, forKey key: String, ttlSeconds: TimeInterval = 300) {
        lock.lock()
        defer { lock.unlock() }
        
        let expiry = Date().addingTimeInterval(ttlSeconds)
        cache[key] = CacheEntry(value: value, expiry: expiry)
    }
    
    public func remove(forKey key: String) {
        lock.lock()
        defer { lock.unlock() }
        cache.removeValue(forKey: key)
    }
    
    public func clearAll() {
        lock.lock()
        defer { lock.unlock() }
        cache.removeAll()
    }
}
