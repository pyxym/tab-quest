// TabAI Console Test
// Copy and paste this into the browser console

console.log('🧪 TabAI Quick Test Starting...\n');

async function testTabAI() {
    try {
        // Test 1: Check if extension is responding
        console.log('📍 Test 1: Extension Communication');
        const testResponse = await chrome.runtime.sendMessage(
            (await chrome.management.getSelf()).id,
            { action: 'test' }
        ).catch(() => null);
        
        console.log('Response:', testResponse || 'No specific test handler');
        
        // Test 2: Get current tabs
        console.log('\n📍 Test 2: Current Tabs');
        const tabs = await chrome.tabs.query({ currentWindow: true });
        console.log(`Found ${tabs.length} tabs:`);
        
        const domains = {};
        tabs.forEach(tab => {
            if (tab.url && !tab.url.startsWith('chrome://')) {
                try {
                    const domain = new URL(tab.url).hostname;
                    domains[domain] = (domains[domain] || 0) + 1;
                } catch (e) {}
            }
        });
        console.table(domains);
        
        // Test 3: Try to organize
        console.log('\n📍 Test 3: Smart Organize');
        console.log('Sending smartOrganize message...');
        
        const result = await chrome.runtime.sendMessage(
            (await chrome.management.getSelf()).id,
            { action: 'smartOrganize' }
        );
        
        console.log('Result:', result);
        
        if (result && result.success) {
            console.log('✅ SUCCESS:', result.message);
        } else {
            console.log('❌ FAILED:', result?.message || 'No response');
        }
        
        // Test 4: Check tab groups
        console.log('\n📍 Test 4: Tab Groups');
        const groups = await chrome.tabGroups.query({});
        console.log(`Found ${groups.length} tab groups:`);
        groups.forEach(group => {
            console.log(`- ${group.title || 'Untitled'} (${group.color})`);
        });
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testTabAI();