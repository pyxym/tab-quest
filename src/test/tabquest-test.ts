// TabQuest Extension Test Suite
// Run this in the browser console after the extension is loaded

interface TestResult {
  name: string
  passed: boolean
  message: string
  error?: any
}

class TabQuestTester {
  private results: TestResult[] = []
  
  constructor() {
    console.log('🧪 TabQuest Test Suite Starting...')
  }
  
  // Helper to wait
  private async wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
  
  // Helper to create test tabs
  private async createTestTabs() {
    console.log('📄 Creating test tabs...')
    
    const testUrls = [
      // Productivity
      'https://www.google.com',
      'https://www.google.com/search?q=test',
      
      // Work
      'https://github.com/user/repo1',
      'https://github.com/user/repo2',
      
      // Social
      'https://twitter.com',
      'https://facebook.com',
      
      // News
      'https://cnn.com',
      'https://bbc.com',
      
      // Duplicates
      'https://stackoverflow.com/questions/123',
      'https://stackoverflow.com/questions/123'
    ]
    
    const tabIds: number[] = []
    
    for (const url of testUrls) {
      try {
        const tab = await chrome.tabs.create({ url, active: false })
        if (tab.id) tabIds.push(tab.id)
        await this.wait(100) // Small delay between tab creation
      } catch (error) {
        console.error('Failed to create tab:', url, error)
      }
    }
    
    console.log(`✅ Created ${tabIds.length} test tabs`)
    return tabIds
  }
  
  // Test 1: Basic Tab Grouping
  async testBasicGrouping() {
    console.log('\n🔍 Test 1: Basic Tab Grouping')
    
    try {
      const result = await chrome.runtime.sendMessage({ action: 'smartOrganize' })
      
      if (result && result.success) {
        this.results.push({
          name: 'Basic Tab Grouping',
          passed: true,
          message: result.message
        })
        
        // Verify groups were created
        const groups = await chrome.tabGroups.query({})
        console.log(`✅ Created ${groups.length} tab groups`)
        
        return true
      } else {
        throw new Error(result?.message || 'No response')
      }
    } catch (error) {
      this.results.push({
        name: 'Basic Tab Grouping',
        passed: false,
        message: 'Failed to organize tabs',
        error
      })
      return false
    }
  }
  
  // Test 2: Category Assignment
  async testCategoryAssignment() {
    console.log('\n🔍 Test 2: Category Assignment')
    
    try {
      // Get current tabs
      const tabs = await chrome.tabs.query({ currentWindow: true })
      
      // Check if tabs have been categorized
      const result = await chrome.runtime.sendMessage({ action: 'getTabsAnalysis' })
      
      if (result && result.categoryCounts) {
        const totalCategorized = Object.values(result.categoryCounts).reduce((a, b) => (a as number) + (b as number), 0) as number
        
        this.results.push({
          name: 'Category Assignment',
          passed: totalCategorized > 0,
          message: `Categorized ${totalCategorized} tabs into ${Object.keys(result.categoryCounts).length} categories`
        })
        
        console.log('📊 Category breakdown:', result.categoryCounts)
        return true
      } else {
        throw new Error('No category data available')
      }
    } catch (error) {
      this.results.push({
        name: 'Category Assignment',
        passed: false,
        message: 'Failed to get category data',
        error
      })
      return false
    }
  }
  
  // Test 3: Duplicate Detection
  async testDuplicateDetection() {
    console.log('\n🔍 Test 3: Duplicate Detection')
    
    try {
      const result = await chrome.runtime.sendMessage({ action: 'findDuplicates' })
      
      if (Array.isArray(result)) {
        const duplicateCount = result.reduce((sum, group) => sum + group.count - 1, 0)
        
        this.results.push({
          name: 'Duplicate Detection',
          passed: true,
          message: `Found ${duplicateCount} duplicate tabs in ${result.length} groups`
        })
        
        if (result.length > 0) {
          console.log('🔄 Duplicate groups:', result)
        }
        return true
      } else {
        throw new Error('Invalid response format')
      }
    } catch (error) {
      this.results.push({
        name: 'Duplicate Detection',
        passed: false,
        message: 'Failed to detect duplicates',
        error
      })
      return false
    }
  }
  
  // Test 4: Storage Operations
  async testStorageOperations() {
    console.log('\n🔍 Test 4: Storage Operations')
    
    try {
      // Test local storage
      await chrome.storage.local.set({ testKey: 'testValue' })
      const localResult = await chrome.storage.local.get('testKey')
      
      // Test sync storage
      const syncResult = await chrome.storage.sync.get(['categories', 'categoryMapping'])
      
      const passed = localResult.testKey === 'testValue' && syncResult.categories !== undefined
      
      this.results.push({
        name: 'Storage Operations',
        passed,
        message: passed ? 'Storage working correctly' : 'Storage issues detected'
      })
      
      // Cleanup
      await chrome.storage.local.remove('testKey')
      
      return passed
    } catch (error) {
      this.results.push({
        name: 'Storage Operations',
        passed: false,
        message: 'Storage operations failed',
        error
      })
      return false
    }
  }
  
  // Test 5: Tab Group Manipulation
  async testTabGroupManipulation() {
    console.log('\n🔍 Test 5: Tab Group Manipulation')
    
    try {
      // Create a test group
      const tabs = await chrome.tabs.query({ currentWindow: true, grouped: false })
      
      if (tabs.length >= 2) {
        const tabIds = tabs.slice(0, 2).map(t => t.id).filter(id => id !== undefined) as number[]
        const groupId = await chrome.tabs.group({ tabIds })
        
        // Update group properties
        await chrome.tabGroups.update(groupId, {
          title: 'Test Group',
          color: 'blue',
          collapsed: false
        })
        
        // Verify group was created
        const group = await chrome.tabGroups.get(groupId)
        
        this.results.push({
          name: 'Tab Group Manipulation',
          passed: group.title === 'Test Group',
          message: 'Successfully created and updated tab group'
        })
        
        // Cleanup - ungroup
        await chrome.tabs.ungroup(tabIds)
        
        return true
      } else {
        throw new Error('Not enough ungrouped tabs for testing')
      }
    } catch (error) {
      this.results.push({
        name: 'Tab Group Manipulation',
        passed: false,
        message: 'Failed to manipulate tab groups',
        error
      })
      return false
    }
  }
  
  // Test 6: Performance Test
  async testPerformance() {
    console.log('\n🔍 Test 6: Performance Test')
    
    try {
      const startTime = performance.now()
      
      // Test organization speed
      await chrome.runtime.sendMessage({ action: 'smartOrganize' })
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      this.results.push({
        name: 'Performance Test',
        passed: duration < 3000, // Should complete within 3 seconds
        message: `Organization completed in ${duration.toFixed(0)}ms`
      })
      
      return duration < 3000
    } catch (error) {
      this.results.push({
        name: 'Performance Test',
        passed: false,
        message: 'Performance test failed',
        error
      })
      return false
    }
  }
  
  // Run all tests
  async runAllTests(createTabs = true) {
    console.log('🚀 Starting TabQuest Test Suite...\n')
    
    let testTabIds: number[] = []
    
    try {
      // Create test tabs if requested
      if (createTabs) {
        testTabIds = await this.createTestTabs()
        await this.wait(2000) // Wait for tabs to fully load
      }
      
      // Run tests in sequence
      await this.testBasicGrouping()
      await this.wait(1000)
      
      await this.testCategoryAssignment()
      await this.wait(500)
      
      await this.testDuplicateDetection()
      await this.wait(500)
      
      await this.testStorageOperations()
      await this.wait(500)
      
      await this.testTabGroupManipulation()
      await this.wait(500)
      
      await this.testPerformance()
      
    } catch (error) {
      console.error('Test suite error:', error)
    } finally {
      // Cleanup test tabs if created
      if (createTabs && testTabIds.length > 0) {
        console.log('\n🧹 Cleaning up test tabs...')
        try {
          await chrome.tabs.remove(testTabIds)
        } catch (error) {
          console.error('Failed to cleanup some tabs:', error)
        }
      }
    }
    
    // Print results
    this.printResults()
  }
  
  // Print test results
  private printResults() {
    console.log('\n📊 TEST RESULTS:')
    console.log('================')
    
    let passed = 0
    let failed = 0
    
    this.results.forEach(result => {
      const icon = result.passed ? '✅' : '❌'
      console.log(`${icon} ${result.name}: ${result.message}`)
      
      if (result.error) {
        console.error('   Error:', result.error)
      }
      
      if (result.passed) passed++
      else failed++
    })
    
    console.log('\n📈 Summary:')
    console.log(`   Passed: ${passed}`)
    console.log(`   Failed: ${failed}`)
    console.log(`   Total: ${this.results.length}`)
    console.log(`   Success Rate: ${((passed / this.results.length) * 100).toFixed(1)}%`)
    
    return this.results
  }
}

// Export for use in console
(window as any).TabQuestTester = TabQuestTester

// Usage instructions
console.log(`
🧪 TabQuest Test Suite Ready!

To run tests:
1. const tester = new TabQuestTester()
2. await tester.runAllTests(true)  // true = create test tabs
   OR
   await tester.runAllTests(false) // false = use existing tabs

Individual tests:
- await tester.testBasicGrouping()
- await tester.testCategoryAssignment()
- await tester.testDuplicateDetection()
- await tester.testStorageOperations()
- await tester.testTabGroupManipulation()
- await tester.testPerformance()
`)