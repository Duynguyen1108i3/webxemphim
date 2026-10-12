//
//  AuthModels.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  Authentication, Session and Profile models matching Prisma schema
//

import Foundation

public struct User: Identifiable, Codable, Hashable {
    public let id: String
    public let email: String
    public let username: String
    public let role: String
    public let avatarUrl: String?
    public let createdAt: String?
    
    public init(id: String, email: String, username: String, role: String = "USER", avatarUrl: String? = nil, createdAt: String? = nil) {
        self.id = id
        self.email = email
        self.username = username
        self.role = role
        self.avatarUrl = avatarUrl
        self.createdAt = createdAt
    }
}

public struct UserProfile: Identifiable, Codable, Hashable {
    public let id: String
    public let userId: String
    public var name: String
    public var type: String // "ADULT" or "KIDS"
    public var avatarUrl: String?
    public var language: String
    
    public init(id: String, userId: String, name: String, type: String = "ADULT", avatarUrl: String? = nil, language: String = "vi") {
        self.id = id
        self.userId = userId
        self.name = name
        self.type = type
        self.avatarUrl = avatarUrl
        self.language = language
    }
}

public struct AuthResponse: Codable {
    public let user: User
    public let token: String?
    public let profiles: [UserProfile]?
    public let message: String?
}

public struct CsrfResponse: Codable {
    public let csrfToken: String
}
