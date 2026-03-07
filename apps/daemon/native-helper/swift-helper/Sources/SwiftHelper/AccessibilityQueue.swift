import Foundation

class AccessibilityQueue {
    static let shared = AccessibilityQueue()

    private let queue = DispatchQueue(
        label: "com.openbeam.accessibility",
        qos: .userInitiated,
        attributes: [],
        autoreleaseFrequency: .workItem
    )

    private let semaphore = DispatchSemaphore(value: 1)

    private init() {}

    func async(execute work: @escaping () -> Void) {
        queue.async {
            self.semaphore.wait()
            defer { self.semaphore.signal() }
            work()
        }
    }

    func sync<T>(execute work: () throws -> T) rethrows -> T {
        try queue.sync {
            semaphore.wait()
            defer { semaphore.signal() }
            return try work()
        }
    }
}
