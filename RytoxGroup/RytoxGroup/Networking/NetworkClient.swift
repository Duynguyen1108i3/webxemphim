//
//  NetworkClient.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  Async/Await HTTP client with CSRF token protection & JWT bearer auth
//

import Foundation

public enum NetworkError: LocalizedError {
    case invalidURL
    case invalidResponse(statusCode: Int)
    case decodingError(Error)
    case unauthorized
    case serverError(String)
    case unknown(Error)
    
    public var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Đường dẫn không hợp lệ."
        case .invalidResponse(let code):
            return "Lỗi phản hồi máy chủ (Mã: \(code))."
        case .decodingError(let err):
            return "Lỗi giải mã dữ liệu: \(err.localizedDescription)"
        case .unauthorized:
            return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
        case .serverError(let msg):
            return msg
        case .unknown(let err):
            return err.localizedDescription
        }
    }
}

public final class NetworkClient {
    public static let shared = NetworkClient()
    
    private let session: URLSession
    
    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = AppConfig.requestTimeoutSeconds
        config.timeoutIntervalForResource = 60.0
        config.httpCookieAcceptPolicy = .always
        config.httpShouldSetCookies = true
        self.session = URLSession(configuration: config)
    }
    
    // MARK: - Generic GET Request
    public func get<T: Decodable>(_ url: URL, headers: [String: String] = [:]) async throws -> T {
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        
        // Attach Auth Token if available
        if let token = KeychainHelper.loadString(key: "auth_token") {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        for (k, v) in headers {
            request.setValue(v, forHTTPHeaderField: k)
        }
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw NetworkError.invalidResponse(statusCode: -1)
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            if httpResponse.statusCode == 401 {
                throw NetworkError.unauthorized
            }
            throw NetworkError.invalidResponse(statusCode: httpResponse.statusCode)
        }
        
        do {
            let decoder = JSONDecoder()
            return try decoder.decode(T.self, from: data)
        } catch {
            throw NetworkError.decodingError(error)
        }
    }
    
    // MARK: - Mutating Request (POST, PUT, DELETE) with CSRF Token
    public func request<B: Encodable, T: Decodable>(
        method: String,
        url: URL,
        body: B?,
        headers: [String: String] = [:]
    ) async throws -> T {
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        
        // CSRF Token Protection (OWASP Top 10 rule)
        if let csrf = KeychainHelper.loadString(key: "csrf_token") {
            req.setValue(csrf, forHTTPHeaderField: "X-CSRF-Token")
        }
        
        // Auth Token
        if let token = KeychainHelper.loadString(key: "auth_token") {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        for (k, v) in headers {
            req.setValue(v, forHTTPHeaderField: k)
        }
        
        if let body = body {
            req.httpBody = try JSONEncoder().encode(body)
        }
        
        let (data, response) = try await session.data(for: req)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw NetworkError.invalidResponse(statusCode: -1)
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            if httpResponse.statusCode == 401 {
                throw NetworkError.unauthorized
            }
            throw NetworkError.invalidResponse(statusCode: httpResponse.statusCode)
        }
        
        do {
            let decoder = JSONDecoder()
            return try decoder.decode(T.self, from: data)
        } catch {
            throw NetworkError.decodingError(error)
        }
    }
    
    // MARK: - Raw JSON fetch (useful for heterogeneous API responses)
    public func fetchRawJSON(_ url: URL) async throws -> [String: Any] {
        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        
        let (data, response) = try await session.data(for: req)
        guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
            throw NetworkError.invalidResponse(statusCode: (response as? HTTPURLResponse)?.statusCode ?? -1)
        }
        
        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw NetworkError.serverError("Invalid JSON structure")
        }
        return json
    }
}
