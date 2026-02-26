import Foundation
import ApplicationServices

// =============================================================================
// PermissionsService - Accessibility Permission Management
// =============================================================================
// Handles checking and requesting accessibility permissions.
// =============================================================================

/// Service for managing accessibility permissions
class PermissionsService {

    // MARK: - Permission Check

    /// Check if accessibility permissions are granted
    /// - Parameter prompt: If true, show the system prompt to request permissions
    /// - Returns: True if permissions are granted
    static func checkPermissions(prompt: Bool = false) -> Bool {
        return AXHelpers.checkAccessibilityPermissions(prompt: prompt)
    }

    // MARK: - Permission Status

    /// Get detailed permission status
    /// - Returns: GetAccessibilityStatusResult with permission details
    static func getStatus() -> GetAccessibilityStatusResult {
        let granted = checkPermissions(prompt: false)

        if granted {
            return GetAccessibilityStatusResult(
                granted: true,
                promptable: nil,
                detail: "Accessibility access is granted."
            )
        }

        return GetAccessibilityStatusResult(
            granted: false,
            promptable: true,
            detail: "Accessibility permission has not been granted yet."
        )
    }

    // MARK: - Request Permission

    /// Request accessibility permission (shows system prompt)
    /// - Returns: RequestAccessibilityPermissionResult with grant status
    static func requestPermission() -> RequestAccessibilityPermissionResult {
        // Show the system accessibility prompt
        let granted = checkPermissions(prompt: true)

        return RequestAccessibilityPermissionResult(
            granted: granted,
            openedSystemSettings: granted ? nil : true
        )
    }
}
