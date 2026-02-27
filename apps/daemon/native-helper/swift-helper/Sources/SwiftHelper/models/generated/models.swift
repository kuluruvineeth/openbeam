// This file was generated from JSON Schema using quicktype, do not modify it directly.
// To parse the JSON, add this file to your project and do:
//
//   let rPCRequestSchema = try RPCRequestSchema(json)
//   let rPCResponseSchema = try RPCResponseSchema(json)
//   let getAccessibilityTreeDetailsParamsSchema = try GetAccessibilityTreeDetailsParamsSchema(json)
//   let getAccessibilityTreeDetailsResultSchema = try GetAccessibilityTreeDetailsResultSchema(json)
//   let getAccessibilityContextParamsSchema = try GetAccessibilityContextParamsSchema(json)
//   let getAccessibilityContextResultSchema = try GetAccessibilityContextResultSchema(json)
//   let pasteTextParamsSchema = try PasteTextParamsSchema(json)
//   let pasteTextResultSchema = try PasteTextResultSchema(json)
//   let muteSystemAudioParamsSchema = try MuteSystemAudioParamsSchema(json)
//   let muteSystemAudioResultSchema = try MuteSystemAudioResultSchema(json)
//   let restoreSystemAudioParamsSchema = try RestoreSystemAudioParamsSchema(json)
//   let restoreSystemAudioResultSchema = try RestoreSystemAudioResultSchema(json)
//   let setShortcutsParamsSchema = try SetShortcutsParamsSchema(json)
//   let setShortcutsResultSchema = try SetShortcutsResultSchema(json)
//   let recheckPressedKeysParamsSchema = try RecheckPressedKeysParamsSchema(json)
//   let recheckPressedKeysResultSchema = try RecheckPressedKeysResultSchema(json)
//   let keyDownEventSchema = try KeyDownEventSchema(json)
//   let keyUpEventSchema = try KeyUpEventSchema(json)
//   let flagsChangedEventSchema = try FlagsChangedEventSchema(json)
//   let helperEventSchema = try HelperEventSchema(json)

import Foundation

// MARK: - RPCRequestSchema
struct RPCRequestSchema: Codable {
    let id: String
    let method: Method
    let params: JSONAny?
}

// MARK: RPCRequestSchema convenience initializers and mutators

extension RPCRequestSchema {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(RPCRequestSchema.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        id: String? = nil,
        method: Method? = nil,
        params: JSONAny?? = nil
    ) -> RPCRequestSchema {
        return RPCRequestSchema(
            id: id ?? self.id,
            method: method ?? self.method,
            params: params ?? self.params
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

enum Method: String, Codable {
    case getAccessibilityContext = "getAccessibilityContext"
    case getAccessibilityStatus = "getAccessibilityStatus"
    case getAccessibilityTreeDetails = "getAccessibilityTreeDetails"
    case muteSystemAudio = "muteSystemAudio"
    case pasteText = "pasteText"
    case recheckPressedKeys = "recheckPressedKeys"
    case requestAccessibilityPermission = "requestAccessibilityPermission"
    case restoreSystemAudio = "restoreSystemAudio"
    case setShortcuts = "setShortcuts"
}

// MARK: - RPCResponseSchema
struct RPCResponseSchema: Codable {
    let error: Error?
    let id: String
    let result: JSONAny?
}

// MARK: RPCResponseSchema convenience initializers and mutators

extension RPCResponseSchema {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(RPCResponseSchema.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        error: Error?? = nil,
        id: String? = nil,
        result: JSONAny?? = nil
    ) -> RPCResponseSchema {
        return RPCResponseSchema(
            error: error ?? self.error,
            id: id ?? self.id,
            result: result ?? self.result
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

// MARK: - Error
struct Error: Codable {
    let code: Int
    let data: JSONAny?
    let message: String
}

// MARK: Error convenience initializers and mutators

extension Error {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(Error.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        code: Int? = nil,
        data: JSONAny?? = nil,
        message: String? = nil
    ) -> Error {
        return Error(
            code: code ?? self.code,
            data: data ?? self.data,
            message: message ?? self.message
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

// MARK: - GetAccessibilityTreeDetailsParamsSchema
struct GetAccessibilityTreeDetailsParamsSchema: Codable {
    let rootID: String?

    enum CodingKeys: String, CodingKey {
        case rootID = "rootId"
    }
}

// MARK: GetAccessibilityTreeDetailsParamsSchema convenience initializers and mutators

extension GetAccessibilityTreeDetailsParamsSchema {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(GetAccessibilityTreeDetailsParamsSchema.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        rootID: String?? = nil
    ) -> GetAccessibilityTreeDetailsParamsSchema {
        return GetAccessibilityTreeDetailsParamsSchema(
            rootID: rootID ?? self.rootID
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

// MARK: - GetAccessibilityTreeDetailsResultSchema
struct GetAccessibilityTreeDetailsResultSchema: Codable {
    let tree: JSONAny?
}

// MARK: GetAccessibilityTreeDetailsResultSchema convenience initializers and mutators

extension GetAccessibilityTreeDetailsResultSchema {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(GetAccessibilityTreeDetailsResultSchema.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        tree: JSONAny?? = nil
    ) -> GetAccessibilityTreeDetailsResultSchema {
        return GetAccessibilityTreeDetailsResultSchema(
            tree: tree ?? self.tree
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

// MARK: - GetAccessibilityContextParamsSchema
struct GetAccessibilityContextParamsSchema: Codable {
    let editableOnly: Bool?
}

// MARK: GetAccessibilityContextParamsSchema convenience initializers and mutators

extension GetAccessibilityContextParamsSchema {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(GetAccessibilityContextParamsSchema.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        editableOnly: Bool?? = nil
    ) -> GetAccessibilityContextParamsSchema {
        return GetAccessibilityContextParamsSchema(
            editableOnly: editableOnly ?? self.editableOnly
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

// MARK: - GetAccessibilityContextResultSchema
struct GetAccessibilityContextResultSchema: Codable {
    let context: Context?
}

// MARK: GetAccessibilityContextResultSchema convenience initializers and mutators

extension GetAccessibilityContextResultSchema {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(GetAccessibilityContextResultSchema.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        context: Context?? = nil
    ) -> GetAccessibilityContextResultSchema {
        return GetAccessibilityContextResultSchema(
            context: context ?? self.context
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

// MARK: - Context
struct Context: Codable {
    let application: Application
    let focusedElement: FocusedElement?
    let metrics: Metrics
    let schemaVersion: SchemaVersion
    let textSelection: TextSelection?
    let timestamp: Double
    let windowInfo: WindowInfo?
}

// MARK: Context convenience initializers and mutators

extension Context {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(Context.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        application: Application? = nil,
        focusedElement: FocusedElement?? = nil,
        metrics: Metrics? = nil,
        schemaVersion: SchemaVersion? = nil,
        textSelection: TextSelection?? = nil,
        timestamp: Double? = nil,
        windowInfo: WindowInfo?? = nil
    ) -> Context {
        return Context(
            application: application ?? self.application,
            focusedElement: focusedElement ?? self.focusedElement,
            metrics: metrics ?? self.metrics,
            schemaVersion: schemaVersion ?? self.schemaVersion,
            textSelection: textSelection ?? self.textSelection,
            timestamp: timestamp ?? self.timestamp,
            windowInfo: windowInfo ?? self.windowInfo
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

// MARK: - Application
struct Application: Codable {
    let bundleIdentifier, name: String?
    let pid: Int
    let version: String?
}

// MARK: Application convenience initializers and mutators

extension Application {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(Application.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        bundleIdentifier: String?? = nil,
        name: String?? = nil,
        pid: Int? = nil,
        version: String?? = nil
    ) -> Application {
        return Application(
            bundleIdentifier: bundleIdentifier ?? self.bundleIdentifier,
            name: name ?? self.name,
            pid: pid ?? self.pid,
            version: version ?? self.version
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

// MARK: - FocusedElement
struct FocusedElement: Codable {
    let description: String?
    let isEditable, isFocused, isPlaceholder, isSecure: Bool
    let role, subrole, title, value: String?
}

// MARK: FocusedElement convenience initializers and mutators

extension FocusedElement {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(FocusedElement.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        description: String?? = nil,
        isEditable: Bool? = nil,
        isFocused: Bool? = nil,
        isPlaceholder: Bool? = nil,
        isSecure: Bool? = nil,
        role: String?? = nil,
        subrole: String?? = nil,
        title: String?? = nil,
        value: String?? = nil
    ) -> FocusedElement {
        return FocusedElement(
            description: description ?? self.description,
            isEditable: isEditable ?? self.isEditable,
            isFocused: isFocused ?? self.isFocused,
            isPlaceholder: isPlaceholder ?? self.isPlaceholder,
            isSecure: isSecure ?? self.isSecure,
            role: role ?? self.role,
            subrole: subrole ?? self.subrole,
            title: title ?? self.title,
            value: value ?? self.value
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

// MARK: - Metrics
struct Metrics: Codable {
    let errors: [String]
    let fallbacksUsed: [The0]
    let textMarkerAttempted, textMarkerSucceeded, timedOut: Bool
    let totalTimeMS: Double
    let webAreaFound, webAreaRetryAttempted, webAreaRetrySucceeded: Bool

    enum CodingKeys: String, CodingKey {
        case errors, fallbacksUsed, textMarkerAttempted, textMarkerSucceeded, timedOut
        case totalTimeMS = "totalTimeMs"
        case webAreaFound, webAreaRetryAttempted, webAreaRetrySucceeded
    }
}

// MARK: Metrics convenience initializers and mutators

extension Metrics {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(Metrics.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        errors: [String]? = nil,
        fallbacksUsed: [The0]? = nil,
        textMarkerAttempted: Bool? = nil,
        textMarkerSucceeded: Bool? = nil,
        timedOut: Bool? = nil,
        totalTimeMS: Double? = nil,
        webAreaFound: Bool? = nil,
        webAreaRetryAttempted: Bool? = nil,
        webAreaRetrySucceeded: Bool? = nil
    ) -> Metrics {
        return Metrics(
            errors: errors ?? self.errors,
            fallbacksUsed: fallbacksUsed ?? self.fallbacksUsed,
            textMarkerAttempted: textMarkerAttempted ?? self.textMarkerAttempted,
            textMarkerSucceeded: textMarkerSucceeded ?? self.textMarkerSucceeded,
            timedOut: timedOut ?? self.timedOut,
            totalTimeMS: totalTimeMS ?? self.totalTimeMS,
            webAreaFound: webAreaFound ?? self.webAreaFound,
            webAreaRetryAttempted: webAreaRetryAttempted ?? self.webAreaRetryAttempted,
            webAreaRetrySucceeded: webAreaRetrySucceeded ?? self.webAreaRetrySucceeded
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

enum The0: String, Codable {
    case clipboardCopy = "clipboardCopy"
    case none = "none"
    case selectedTextRange = "selectedTextRange"
    case selectedTextRanges = "selectedTextRanges"
    case stringForRange = "stringForRange"
    case textMarkerRange = "textMarkerRange"
    case valueAttribute = "valueAttribute"
}

enum SchemaVersion: String, Codable {
    case the20 = "2.0"
}

// MARK: - TextSelection
struct TextSelection: Codable {
    let extractionMethod: The0
    let fullContent: String?
    let fullContentTruncated, hasMultipleRanges, isEditable, isPlaceholder: Bool
    let isSecure: Bool
    let postSelectionText, preSelectionText, selectedText: String?
    let selectionRange: SelectionRange?
}

// MARK: TextSelection convenience initializers and mutators

extension TextSelection {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(TextSelection.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        extractionMethod: The0? = nil,
        fullContent: String?? = nil,
        fullContentTruncated: Bool? = nil,
        hasMultipleRanges: Bool? = nil,
        isEditable: Bool? = nil,
        isPlaceholder: Bool? = nil,
        isSecure: Bool? = nil,
        postSelectionText: String?? = nil,
        preSelectionText: String?? = nil,
        selectedText: String?? = nil,
        selectionRange: SelectionRange?? = nil
    ) -> TextSelection {
        return TextSelection(
            extractionMethod: extractionMethod ?? self.extractionMethod,
            fullContent: fullContent ?? self.fullContent,
            fullContentTruncated: fullContentTruncated ?? self.fullContentTruncated,
            hasMultipleRanges: hasMultipleRanges ?? self.hasMultipleRanges,
            isEditable: isEditable ?? self.isEditable,
            isPlaceholder: isPlaceholder ?? self.isPlaceholder,
            isSecure: isSecure ?? self.isSecure,
            postSelectionText: postSelectionText ?? self.postSelectionText,
            preSelectionText: preSelectionText ?? self.preSelectionText,
            selectedText: selectedText ?? self.selectedText,
            selectionRange: selectionRange ?? self.selectionRange
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

// MARK: - SelectionRange
struct SelectionRange: Codable {
    let length, location: Int
}

// MARK: SelectionRange convenience initializers and mutators

extension SelectionRange {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(SelectionRange.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        length: Int? = nil,
        location: Int? = nil
    ) -> SelectionRange {
        return SelectionRange(
            length: length ?? self.length,
            location: location ?? self.location
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

// MARK: - WindowInfo
struct WindowInfo: Codable {
    let title, url: String?
}

// MARK: WindowInfo convenience initializers and mutators

extension WindowInfo {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(WindowInfo.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        title: String?? = nil,
        url: String?? = nil
    ) -> WindowInfo {
        return WindowInfo(
            title: title ?? self.title,
            url: url ?? self.url
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

// MARK: - PasteTextParamsSchema
struct PasteTextParamsSchema: Codable {
    let transcript: String
}

// MARK: PasteTextParamsSchema convenience initializers and mutators

extension PasteTextParamsSchema {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(PasteTextParamsSchema.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        transcript: String? = nil
    ) -> PasteTextParamsSchema {
        return PasteTextParamsSchema(
            transcript: transcript ?? self.transcript
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

// MARK: - PasteTextResultSchema
struct PasteTextResultSchema: Codable {
    let message: String?
    let success: Bool
}

// MARK: PasteTextResultSchema convenience initializers and mutators

extension PasteTextResultSchema {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(PasteTextResultSchema.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        message: String?? = nil,
        success: Bool? = nil
    ) -> PasteTextResultSchema {
        return PasteTextResultSchema(
            message: message ?? self.message,
            success: success ?? self.success
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

// MARK: - MuteSystemAudioResultSchema
struct MuteSystemAudioResultSchema: Codable {
    let message: String?
    let success: Bool
}

// MARK: MuteSystemAudioResultSchema convenience initializers and mutators

extension MuteSystemAudioResultSchema {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(MuteSystemAudioResultSchema.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        message: String?? = nil,
        success: Bool? = nil
    ) -> MuteSystemAudioResultSchema {
        return MuteSystemAudioResultSchema(
            message: message ?? self.message,
            success: success ?? self.success
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

// MARK: - RestoreSystemAudioResultSchema
struct RestoreSystemAudioResultSchema: Codable {
    let message: String?
    let success: Bool
}

// MARK: RestoreSystemAudioResultSchema convenience initializers and mutators

extension RestoreSystemAudioResultSchema {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(RestoreSystemAudioResultSchema.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        message: String?? = nil,
        success: Bool? = nil
    ) -> RestoreSystemAudioResultSchema {
        return RestoreSystemAudioResultSchema(
            message: message ?? self.message,
            success: success ?? self.success
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

// MARK: - SetShortcutsParamsSchema
struct SetShortcutsParamsSchema: Codable {
    let newNote, pasteLastTranscript, pushToTalk, toggleRecording: [Int]
}

// MARK: SetShortcutsParamsSchema convenience initializers and mutators

extension SetShortcutsParamsSchema {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(SetShortcutsParamsSchema.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        newNote: [Int]? = nil,
        pasteLastTranscript: [Int]? = nil,
        pushToTalk: [Int]? = nil,
        toggleRecording: [Int]? = nil
    ) -> SetShortcutsParamsSchema {
        return SetShortcutsParamsSchema(
            newNote: newNote ?? self.newNote,
            pasteLastTranscript: pasteLastTranscript ?? self.pasteLastTranscript,
            pushToTalk: pushToTalk ?? self.pushToTalk,
            toggleRecording: toggleRecording ?? self.toggleRecording
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

// MARK: - SetShortcutsResultSchema
struct SetShortcutsResultSchema: Codable {
    let success: Bool
}

// MARK: SetShortcutsResultSchema convenience initializers and mutators

extension SetShortcutsResultSchema {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(SetShortcutsResultSchema.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        success: Bool? = nil
    ) -> SetShortcutsResultSchema {
        return SetShortcutsResultSchema(
            success: success ?? self.success
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

// MARK: - RecheckPressedKeysParamsSchema
struct RecheckPressedKeysParamsSchema: Codable {
    let pressedKeyCodes: [Int]
}

// MARK: RecheckPressedKeysParamsSchema convenience initializers and mutators

extension RecheckPressedKeysParamsSchema {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(RecheckPressedKeysParamsSchema.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        pressedKeyCodes: [Int]? = nil
    ) -> RecheckPressedKeysParamsSchema {
        return RecheckPressedKeysParamsSchema(
            pressedKeyCodes: pressedKeyCodes ?? self.pressedKeyCodes
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

// MARK: - RecheckPressedKeysResultSchema
struct RecheckPressedKeysResultSchema: Codable {
    let staleKeyCodes: [Int]
}

// MARK: RecheckPressedKeysResultSchema convenience initializers and mutators

extension RecheckPressedKeysResultSchema {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(RecheckPressedKeysResultSchema.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        staleKeyCodes: [Int]? = nil
    ) -> RecheckPressedKeysResultSchema {
        return RecheckPressedKeysResultSchema(
            staleKeyCodes: staleKeyCodes ?? self.staleKeyCodes
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

// MARK: - KeyDownEventSchema
struct KeyDownEventSchema: Codable {
    let payload: KeyDownEventSchemaPayload
    let timestamp: Date?
    let type: KeyDownEventSchemaType
}

// MARK: KeyDownEventSchema convenience initializers and mutators

extension KeyDownEventSchema {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(KeyDownEventSchema.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        payload: KeyDownEventSchemaPayload? = nil,
        timestamp: Date?? = nil,
        type: KeyDownEventSchemaType? = nil
    ) -> KeyDownEventSchema {
        return KeyDownEventSchema(
            payload: payload ?? self.payload,
            timestamp: timestamp ?? self.timestamp,
            type: type ?? self.type
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

// MARK: - KeyDownEventSchemaPayload
struct KeyDownEventSchemaPayload: Codable {
    let altKey: Bool?
    let code: String?
    let ctrlKey: Bool?
    /// State of the Fn key.
    let fnKeyPressed: Bool?
    let key: String?
    /// Raw key code, e.g., from CGEvent
    let keyCode: Int
    let metaKey, shiftKey: Bool?
}

// MARK: KeyDownEventSchemaPayload convenience initializers and mutators

extension KeyDownEventSchemaPayload {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(KeyDownEventSchemaPayload.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        altKey: Bool?? = nil,
        code: String?? = nil,
        ctrlKey: Bool?? = nil,
        fnKeyPressed: Bool?? = nil,
        key: String?? = nil,
        keyCode: Int? = nil,
        metaKey: Bool?? = nil,
        shiftKey: Bool?? = nil
    ) -> KeyDownEventSchemaPayload {
        return KeyDownEventSchemaPayload(
            altKey: altKey ?? self.altKey,
            code: code ?? self.code,
            ctrlKey: ctrlKey ?? self.ctrlKey,
            fnKeyPressed: fnKeyPressed ?? self.fnKeyPressed,
            key: key ?? self.key,
            keyCode: keyCode ?? self.keyCode,
            metaKey: metaKey ?? self.metaKey,
            shiftKey: shiftKey ?? self.shiftKey
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

enum KeyDownEventSchemaType: String, Codable {
    case keyDown = "keyDown"
}

// MARK: - KeyUpEventSchema
struct KeyUpEventSchema: Codable {
    let payload: KeyUpEventSchemaPayload
    let timestamp: Date?
    let type: KeyUpEventSchemaType
}

// MARK: KeyUpEventSchema convenience initializers and mutators

extension KeyUpEventSchema {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(KeyUpEventSchema.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        payload: KeyUpEventSchemaPayload? = nil,
        timestamp: Date?? = nil,
        type: KeyUpEventSchemaType? = nil
    ) -> KeyUpEventSchema {
        return KeyUpEventSchema(
            payload: payload ?? self.payload,
            timestamp: timestamp ?? self.timestamp,
            type: type ?? self.type
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

// MARK: - KeyUpEventSchemaPayload
struct KeyUpEventSchemaPayload: Codable {
    let altKey: Bool?
    let code: String?
    let ctrlKey: Bool?
    /// State of the Fn key.
    let fnKeyPressed: Bool?
    let key: String?
    /// Raw key code, e.g., from CGEvent
    let keyCode: Int
    let metaKey, shiftKey: Bool?
}

// MARK: KeyUpEventSchemaPayload convenience initializers and mutators

extension KeyUpEventSchemaPayload {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(KeyUpEventSchemaPayload.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        altKey: Bool?? = nil,
        code: String?? = nil,
        ctrlKey: Bool?? = nil,
        fnKeyPressed: Bool?? = nil,
        key: String?? = nil,
        keyCode: Int? = nil,
        metaKey: Bool?? = nil,
        shiftKey: Bool?? = nil
    ) -> KeyUpEventSchemaPayload {
        return KeyUpEventSchemaPayload(
            altKey: altKey ?? self.altKey,
            code: code ?? self.code,
            ctrlKey: ctrlKey ?? self.ctrlKey,
            fnKeyPressed: fnKeyPressed ?? self.fnKeyPressed,
            key: key ?? self.key,
            keyCode: keyCode ?? self.keyCode,
            metaKey: metaKey ?? self.metaKey,
            shiftKey: shiftKey ?? self.shiftKey
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

enum KeyUpEventSchemaType: String, Codable {
    case keyUp = "keyUp"
}

// MARK: - FlagsChangedEventSchema
struct FlagsChangedEventSchema: Codable {
    let payload: FlagsChangedEventSchemaPayload
    let timestamp: Date?
    let type: FlagsChangedEventSchemaType
}

// MARK: FlagsChangedEventSchema convenience initializers and mutators

extension FlagsChangedEventSchema {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(FlagsChangedEventSchema.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        payload: FlagsChangedEventSchemaPayload? = nil,
        timestamp: Date?? = nil,
        type: FlagsChangedEventSchemaType? = nil
    ) -> FlagsChangedEventSchema {
        return FlagsChangedEventSchema(
            payload: payload ?? self.payload,
            timestamp: timestamp ?? self.timestamp,
            type: type ?? self.type
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

// MARK: - FlagsChangedEventSchemaPayload
struct FlagsChangedEventSchemaPayload: Codable {
    let altKey: Bool?
    let code: String?
    let ctrlKey: Bool?
    /// State of the Fn key.
    let fnKeyPressed: Bool?
    let key: String?
    /// Raw key code, e.g., from CGEvent
    let keyCode: Int
    let metaKey, shiftKey: Bool?
}

// MARK: FlagsChangedEventSchemaPayload convenience initializers and mutators

extension FlagsChangedEventSchemaPayload {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(FlagsChangedEventSchemaPayload.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        altKey: Bool?? = nil,
        code: String?? = nil,
        ctrlKey: Bool?? = nil,
        fnKeyPressed: Bool?? = nil,
        key: String?? = nil,
        keyCode: Int? = nil,
        metaKey: Bool?? = nil,
        shiftKey: Bool?? = nil
    ) -> FlagsChangedEventSchemaPayload {
        return FlagsChangedEventSchemaPayload(
            altKey: altKey ?? self.altKey,
            code: code ?? self.code,
            ctrlKey: ctrlKey ?? self.ctrlKey,
            fnKeyPressed: fnKeyPressed ?? self.fnKeyPressed,
            key: key ?? self.key,
            keyCode: keyCode ?? self.keyCode,
            metaKey: metaKey ?? self.metaKey,
            shiftKey: shiftKey ?? self.shiftKey
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

enum FlagsChangedEventSchemaType: String, Codable {
    case flagsChanged = "flagsChanged"
}

// MARK: - HelperEventSchema
struct HelperEventSchema: Codable {
    let payload: HelperEventSchemaPayload
    let timestamp: Date?
    let type: HelperEventSchemaType
}

// MARK: HelperEventSchema convenience initializers and mutators

extension HelperEventSchema {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(HelperEventSchema.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        payload: HelperEventSchemaPayload? = nil,
        timestamp: Date?? = nil,
        type: HelperEventSchemaType? = nil
    ) -> HelperEventSchema {
        return HelperEventSchema(
            payload: payload ?? self.payload,
            timestamp: timestamp ?? self.timestamp,
            type: type ?? self.type
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

// MARK: - HelperEventSchemaPayload
struct HelperEventSchemaPayload: Codable {
    let altKey: Bool?
    let code: String?
    let ctrlKey: Bool?
    /// State of the Fn key.
    let fnKeyPressed: Bool?
    let key: String?
    /// Raw key code, e.g., from CGEvent
    let keyCode: Int
    let metaKey, shiftKey: Bool?
}

// MARK: HelperEventSchemaPayload convenience initializers and mutators

extension HelperEventSchemaPayload {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(HelperEventSchemaPayload.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        altKey: Bool?? = nil,
        code: String?? = nil,
        ctrlKey: Bool?? = nil,
        fnKeyPressed: Bool?? = nil,
        key: String?? = nil,
        keyCode: Int? = nil,
        metaKey: Bool?? = nil,
        shiftKey: Bool?? = nil
    ) -> HelperEventSchemaPayload {
        return HelperEventSchemaPayload(
            altKey: altKey ?? self.altKey,
            code: code ?? self.code,
            ctrlKey: ctrlKey ?? self.ctrlKey,
            fnKeyPressed: fnKeyPressed ?? self.fnKeyPressed,
            key: key ?? self.key,
            keyCode: keyCode ?? self.keyCode,
            metaKey: metaKey ?? self.metaKey,
            shiftKey: shiftKey ?? self.shiftKey
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

enum HelperEventSchemaType: String, Codable {
    case flagsChanged = "flagsChanged"
    case keyDown = "keyDown"
    case keyUp = "keyUp"
}

typealias MuteSystemAudioParamsSchema = JSONAny
typealias RestoreSystemAudioParamsSchema = JSONAny

// MARK: - Helper functions for creating encoders and decoders

func newJSONDecoder() -> JSONDecoder {
    let decoder = JSONDecoder()
    if #available(iOS 10.0, OSX 10.12, tvOS 10.0, watchOS 3.0, *) {
        decoder.dateDecodingStrategy = .iso8601
    }
    return decoder
}

func newJSONEncoder() -> JSONEncoder {
    let encoder = JSONEncoder()
    if #available(iOS 10.0, OSX 10.12, tvOS 10.0, watchOS 3.0, *) {
        encoder.dateEncodingStrategy = .iso8601
    }
    return encoder
}

// MARK: - Encode/decode helpers

class JSONNull: Codable, Hashable {

    public static func == (lhs: JSONNull, rhs: JSONNull) -> Bool {
            return true
    }

    public var hashValue: Int {
            return 0
    }

    public init() {}

    public required init(from decoder: Decoder) throws {
            let container = try decoder.singleValueContainer()
            if !container.decodeNil() {
                    throw DecodingError.typeMismatch(JSONNull.self, DecodingError.Context(codingPath: decoder.codingPath, debugDescription: "Wrong type for JSONNull"))
            }
    }

    public func encode(to encoder: Encoder) throws {
            var container = encoder.singleValueContainer()
            try container.encodeNil()
    }
}

class JSONCodingKey: CodingKey {
    let key: String

    required init?(intValue: Int) {
            return nil
    }

    required init?(stringValue: String) {
            key = stringValue
    }

    var intValue: Int? {
            return nil
    }

    var stringValue: String {
            return key
    }
}

class JSONAny: Codable {

    let value: Any

    static func decodingError(forCodingPath codingPath: [CodingKey]) -> DecodingError {
            let context = DecodingError.Context(codingPath: codingPath, debugDescription: "Cannot decode JSONAny")
            return DecodingError.typeMismatch(JSONAny.self, context)
    }

    static func encodingError(forValue value: Any, codingPath: [CodingKey]) -> EncodingError {
            let context = EncodingError.Context(codingPath: codingPath, debugDescription: "Cannot encode JSONAny")
            return EncodingError.invalidValue(value, context)
    }

    static func decode(from container: SingleValueDecodingContainer) throws -> Any {
            if let value = try? container.decode(Bool.self) {
                    return value
            }
            if let value = try? container.decode(Int64.self) {
                    return value
            }
            if let value = try? container.decode(Double.self) {
                    return value
            }
            if let value = try? container.decode(String.self) {
                    return value
            }
            if container.decodeNil() {
                    return JSONNull()
            }
            throw decodingError(forCodingPath: container.codingPath)
    }

    static func decode(from container: inout UnkeyedDecodingContainer) throws -> Any {
            if let value = try? container.decode(Bool.self) {
                    return value
            }
            if let value = try? container.decode(Int64.self) {
                    return value
            }
            if let value = try? container.decode(Double.self) {
                    return value
            }
            if let value = try? container.decode(String.self) {
                    return value
            }
            if let value = try? container.decodeNil() {
                    if value {
                            return JSONNull()
                    }
            }
            if var container = try? container.nestedUnkeyedContainer() {
                    return try decodeArray(from: &container)
            }
            if var container = try? container.nestedContainer(keyedBy: JSONCodingKey.self) {
                    return try decodeDictionary(from: &container)
            }
            throw decodingError(forCodingPath: container.codingPath)
    }

    static func decode(from container: inout KeyedDecodingContainer<JSONCodingKey>, forKey key: JSONCodingKey) throws -> Any {
            if let value = try? container.decode(Bool.self, forKey: key) {
                    return value
            }
            if let value = try? container.decode(Int64.self, forKey: key) {
                    return value
            }
            if let value = try? container.decode(Double.self, forKey: key) {
                    return value
            }
            if let value = try? container.decode(String.self, forKey: key) {
                    return value
            }
            if let value = try? container.decodeNil(forKey: key) {
                    if value {
                            return JSONNull()
                    }
            }
            if var container = try? container.nestedUnkeyedContainer(forKey: key) {
                    return try decodeArray(from: &container)
            }
            if var container = try? container.nestedContainer(keyedBy: JSONCodingKey.self, forKey: key) {
                    return try decodeDictionary(from: &container)
            }
            throw decodingError(forCodingPath: container.codingPath)
    }

    static func decodeArray(from container: inout UnkeyedDecodingContainer) throws -> [Any] {
            var arr: [Any] = []
            while !container.isAtEnd {
                    let value = try decode(from: &container)
                    arr.append(value)
            }
            return arr
    }

    static func decodeDictionary(from container: inout KeyedDecodingContainer<JSONCodingKey>) throws -> [String: Any] {
            var dict = [String: Any]()
            for key in container.allKeys {
                    let value = try decode(from: &container, forKey: key)
                    dict[key.stringValue] = value
            }
            return dict
    }

    static func encode(to container: inout UnkeyedEncodingContainer, array: [Any]) throws {
            for value in array {
                    if let value = value as? Bool {
                            try container.encode(value)
                    } else if let value = value as? Int64 {
                            try container.encode(value)
                    } else if let value = value as? Double {
                            try container.encode(value)
                    } else if let value = value as? String {
                            try container.encode(value)
                    } else if value is JSONNull {
                            try container.encodeNil()
                    } else if let value = value as? [Any] {
                            var container = container.nestedUnkeyedContainer()
                            try encode(to: &container, array: value)
                    } else if let value = value as? [String: Any] {
                            var container = container.nestedContainer(keyedBy: JSONCodingKey.self)
                            try encode(to: &container, dictionary: value)
                    } else {
                            throw encodingError(forValue: value, codingPath: container.codingPath)
                    }
            }
    }

    static func encode(to container: inout KeyedEncodingContainer<JSONCodingKey>, dictionary: [String: Any]) throws {
            for (key, value) in dictionary {
                    let key = JSONCodingKey(stringValue: key)!
                    if let value = value as? Bool {
                            try container.encode(value, forKey: key)
                    } else if let value = value as? Int64 {
                            try container.encode(value, forKey: key)
                    } else if let value = value as? Double {
                            try container.encode(value, forKey: key)
                    } else if let value = value as? String {
                            try container.encode(value, forKey: key)
                    } else if value is JSONNull {
                            try container.encodeNil(forKey: key)
                    } else if let value = value as? [Any] {
                            var container = container.nestedUnkeyedContainer(forKey: key)
                            try encode(to: &container, array: value)
                    } else if let value = value as? [String: Any] {
                            var container = container.nestedContainer(keyedBy: JSONCodingKey.self, forKey: key)
                            try encode(to: &container, dictionary: value)
                    } else {
                            throw encodingError(forValue: value, codingPath: container.codingPath)
                    }
            }
    }

    static func encode(to container: inout SingleValueEncodingContainer, value: Any) throws {
            if let value = value as? Bool {
                    try container.encode(value)
            } else if let value = value as? Int64 {
                    try container.encode(value)
            } else if let value = value as? Double {
                    try container.encode(value)
            } else if let value = value as? String {
                    try container.encode(value)
            } else if value is JSONNull {
                    try container.encodeNil()
            } else {
                    throw encodingError(forValue: value, codingPath: container.codingPath)
            }
    }

    public required init(from decoder: Decoder) throws {
            if var arrayContainer = try? decoder.unkeyedContainer() {
                    self.value = try JSONAny.decodeArray(from: &arrayContainer)
            } else if var container = try? decoder.container(keyedBy: JSONCodingKey.self) {
                    self.value = try JSONAny.decodeDictionary(from: &container)
            } else {
                    let container = try decoder.singleValueContainer()
                    self.value = try JSONAny.decode(from: container)
            }
    }

    public func encode(to encoder: Encoder) throws {
            if let arr = self.value as? [Any] {
                    var container = encoder.unkeyedContainer()
                    try JSONAny.encode(to: &container, array: arr)
            } else if let dict = self.value as? [String: Any] {
                    var container = encoder.container(keyedBy: JSONCodingKey.self)
                    try JSONAny.encode(to: &container, dictionary: dict)
            } else {
                    var container = encoder.singleValueContainer()
                    try JSONAny.encode(to: &container, value: self.value)
            }
    }
}
