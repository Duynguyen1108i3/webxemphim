//
//  AuthService.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  Authentication, Session & User management service matching backend Express API
//

import Foundation

public final class AuthService {
    public static let shared = AuthService()
    private let client = NetworkClient.shared
    
    private init() {}
    
    // MARK: - 1. Fetch CSRF Token (OWASP directive)
    public func fetchCsrfToken() async {
        guard let url = APIEndpoint.backendCsrf.url else { return }
        do {
            let res: CsrfResponse = try await client.get(url)
            _ = KeychainHelper.saveString(key: "csrf_token", value: res.csrfToken)
        } catch {
            // CSRF fetch failed (e.g. offline or dev backend without CSRF)
        }
    }
    
    // MARK: - 2. Login
    public func login(identity: String, pass: String) async throws -> AuthResponse {
        guard let url = APIEndpoint.backendLogin.url else {
            throw NetworkError.invalidURL
        }
        
        let body = [
            "email": identity,
            "password": pass
        ]
        
        let response: AuthResponse = try await client.request(
            method: "POST",
            url: url,
            body: body
        )
        
        if let token = response.token {
            _ = KeychainHelper.saveString(key: "auth_token", value: token)
        }
        return response
    }
    
    // MARK: - 3. Register
    public func register(username: String, email: String, pass: String) async throws -> AuthResponse {
        guard let url = APIEndpoint.backendRegister.url else {
            throw NetworkError.invalidURL
        }
        
        let body = [
            "username": username,
            "email": email,
            "password": pass
        ]
        
        let response: AuthResponse = try await client.request(
            method: "POST",
            url: url,
            body: body
        )
        
        if let token = response.token {
            _ = KeychainHelper.saveString(key: "auth_token", value: token)
        }
        return response
    }
    
    // MARK: - 4. Logout
    public func logout() async {
        if let url = APIEndpoint.backendLogout.url {
            let emptyBody: [String: String]? = nil
            _ = try? await client.request(method: "POST", url: url, body: emptyBody) as [String: String]
        }
        KeychainHelper.delete(key: "auth_token")
    }
    
    // MARK: - 5. Heartbeat Watch Progress Tracking (Section 6 from Blueprint)
    public func reportWatchProgress(
        profileId: String,
        movieId: String,
        episodeId: String,
        progressSeconds: Int,
        durationSeconds: Int
    ) async {
        guard let url = APIEndpoint.backendWatchProgress(profileId: profileId).url else { return }
        let report = WatchProgressReport(
            profileId: profileId,
            movieId: movieId,
            episodeId: episodeId,
            progressSeconds: progressSeconds,
            durationSeconds: durationSeconds
        )
        
        _ = try? await client.request(
            method: "POST",
            url: url,
            body: report
        ) as [String: String]
    }
}
