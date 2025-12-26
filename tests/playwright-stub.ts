// Minimal stub for @playwright/test to satisfy Vitest runs without exercising real browser APIs
import {
	describe as vitestDescribe,
	test as vitestTest,
	expect as vitestExpect,
	beforeAll as vitestBeforeAll,
	afterAll as vitestAfterAll,
	beforeEach as vitestBeforeEach,
	afterEach as vitestAfterEach,
} from 'vitest'

// Register skipped tests/suites so Vitest sees a suite and doesn't error, but never executes bodies
const test: any = function (...args: any[]) {
	return vitestTest.skip(...args)
}

test.describe = (title: string, fn?: () => void) => vitestDescribe.skip(title, fn)
test.skip = vitestTest.skip
test.use = () => {}
test.beforeAll = vitestBeforeAll
test.afterAll = vitestAfterAll
test.beforeEach = vitestBeforeEach
test.afterEach = vitestAfterEach

export { test }
export const expect = vitestExpect
export const chromium = {}

export default { test, expect, chromium }
