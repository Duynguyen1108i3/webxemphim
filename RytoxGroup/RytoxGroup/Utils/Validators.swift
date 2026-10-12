//
//  Validators.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  Adhering to NIST CSF & OWASP Top 10 rules from project guidelines
//

import Foundation

public enum Validators {
    /// Password Complexity Rule:
    /// Minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 number, and 1 special character
    public static func isStrongPassword(_ pass: String) -> Bool {
        let pattern = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$"
        return pass.range(of: pattern, options: .regularExpression) != nil
    }
    
    /// Email format validation
    public static func isValidEmail(_ email: String) -> Bool {
        let pattern = "^[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}$"
        return email.range(of: pattern, options: .regularExpression) != nil
    }
    
    /// Username validation (alphanumeric, 3-30 characters)
    public static func isValidUsername(_ username: String) -> Bool {
        let pattern = "^[a-zA-Z0-9_]{3,30}$"
        return username.range(of: pattern, options: .regularExpression) != nil
    }
    
    /// Sanitize input string before display/storage
    public static func sanitize(_ text: String) -> String {
        return text.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}
