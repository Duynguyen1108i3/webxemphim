//
//  AuthManager.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  Authentication state manager matching authStore.ts
//

import SwiftUI
import Combine

public final class AuthManager: ObservableObject {
    public static let shared = AuthManager()
    
    @Published public var user: User?
    @Published public var isAuthenticated: Bool = false
    @Published public var selectedProfile: UserProfile?
    @Published public var profiles: [UserProfile] = []
    @Published public var isLoading: Bool = false
    @Published public var errorMessage: String?
    
    private let authService = AuthService.shared
    
    private init() {
        restoreSession()
    }
    
    // MARK: - Restore saved session
    public func restoreSession() {
        if let token = KeychainHelper.loadString(key: "auth_token"), !token.isEmpty {
            // Restore cached profile or user
            if let savedEmail = UserDefaults.standard.string(forKey: "user_email"),
               let savedUsername = UserDefaults.standard.string(forKey: "user_name") {
                let u = User(id: "cached_user", email: savedEmail, username: savedUsername)
                self.user = u
                self.isAuthenticated = true
                
                let defaultProfile = UserProfile(id: "default_prof", userId: u.id, name: u.username, type: "ADULT")
                self.profiles = [defaultProfile]
                self.selectedProfile = defaultProfile
            }
        }
        
        Task {
            await authService.fetchCsrfToken()
        }
    }
    
    // MARK: - Login
    @MainActor
    public func login(identity: String, pass: String) async -> Bool {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        
        do {
            let res = try await authService.login(identity: identity, pass: pass)
            self.user = res.user
            self.isAuthenticated = true
            
            UserDefaults.standard.set(res.user.email, forKey: "user_email")
            UserDefaults.standard.set(res.user.username, forKey: "user_name")
            
            let profs = res.profiles ?? [UserProfile(id: "prof_1", userId: res.user.id, name: res.user.username)]
            self.profiles = profs
            self.selectedProfile = profs.first
            HapticFeedback.success()
            return true
        } catch {
            self.errorMessage = error.localizedDescription
            HapticFeedback.error()
            return false
        }
    }
    
    // MARK: - Register
    @MainActor
    public func register(username: String, email: String, pass: String) async -> Bool {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        
        do {
            let res = try await authService.register(username: username, email: email, pass: pass)
            self.user = res.user
            self.isAuthenticated = true
            
            UserDefaults.standard.set(res.user.email, forKey: "user_email")
            UserDefaults.standard.set(res.user.username, forKey: "user_name")
            
            let profs = [UserProfile(id: "prof_1", userId: res.user.id, name: res.user.username)]
            self.profiles = profs
            self.selectedProfile = profs.first
            HapticFeedback.success()
            return true
        } catch {
            self.errorMessage = error.localizedDescription
            HapticFeedback.error()
            return false
        }
    }
    
    // MARK: - Logout
    @MainActor
    public func logout() {
        Task {
            await authService.logout()
        }
        self.user = nil
        self.isAuthenticated = false
        self.selectedProfile = nil
        self.profiles = []
        UserDefaults.standard.removeObject(forKey: "user_email")
        UserDefaults.standard.removeObject(forKey: "user_name")
        HapticFeedback.light()
    }
}
