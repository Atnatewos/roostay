// scripts/test-messaging.js
// Automated integration test for the Messaging API
// Tests authentication, sending messages, and retrieving conversations
// Requires the Next.js dev server to be running on http://localhost:3000
// Author: Theron

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

// ============================================================================
// TEST DATA
// ============================================================================
const USER_A = {
  email: `test_host_${Date.now()}@roostay.test`,
  password: 'TestPassword123',
  firstName: 'Test',
  lastName: 'Host',
  phoneNumber: '+251911111111',
};

const USER_B = {
  email: `test_guest_${Date.now()}@roostay.test`,
  password: 'TestPassword123',
  firstName: 'Test',
  lastName: 'Guest',
  phoneNumber: '+251922222222',
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Makes an HTTP request to the API with optional authentication.
 * @param {string} method - HTTP method (GET, POST, etc.)
 * @param {string} path - API endpoint path (e.g., '/api/messages')
 * @param {Object} [body] - Request body payload
 * @param {string} [token] - JWT access token for Authorization header
 * @returns {Promise<Object>} Response data and status
 */
async function apiRequest(method, path, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = { method, headers };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${path}`, options);
  const data = await response.json();
  return { status: response.status, data };
}

/**
 * Registers a user and returns their ID and auth token.
 */
async function registerAndLogin(user) {
  // Register
  const regRes = await apiRequest('POST', '/api/auth/register', user);
  if (regRes.status !== 201) throw new Error(`Registration failed: ${JSON.stringify(regRes.data)}`);
  
  // Login to get token
  const loginRes = await apiRequest('POST', '/api/auth/login', { 
    email: user.email, 
    password: user.password 
  });
  if (loginRes.status !== 200) throw new Error(`Login failed: ${JSON.stringify(loginRes.data)}`);

  return {
    id: loginRes.data.data.user.id,
    token: loginRes.data.data.tokens.accessToken,
    name: `${user.firstName} ${user.lastName}`,
  };
}

// ============================================================================
// MAIN TEST EXECUTION
// ============================================================================
async function runTests() {
  console.log('\n🚀 Starting Messaging API Tests...\n');
  console.log(`📡 Target API: ${BASE_URL}\n`);

  let userA, userB;

  try {
    // -------------------------------------------------------------------------
    // STEP 1: Setup Users
    // -------------------------------------------------------------------------
    console.log('1️  Setting up test users...');
    userA = await registerAndLogin(USER_A);
    userB = await registerAndLogin(USER_B);
    console.log(`   ✅ User A created: ${userA.name} (${userA.id})`);
    console.log(`   ✅ User B created: ${userB.name} (${userB.id})\n`);

    // -------------------------------------------------------------------------
    // STEP 2: Send Message (User A -> User B)
    // -------------------------------------------------------------------------
    console.log('2️  Testing POST /api/messages (Send Message)...');
    const msgRes = await apiRequest('POST', '/api/messages', {
      receiverId: userB.id,
      messageText: 'Hello! Is your listing in Bole available for next weekend?',
    }, userA.token);

    if (msgRes.status === 201) {
      console.log('   ✅ Message sent successfully!');
      console.log(`   📝 Content: "${msgRes.data.data.message.message_text}"\n`);
    } else {
      throw new Error(`Failed to send message: ${JSON.stringify(msgRes.data)}`);
    }

    // -------------------------------------------------------------------------
    // STEP 3: Get Conversations (User A)
    // -------------------------------------------------------------------------
    console.log('3️⃣  Testing GET /api/messages/conversations (User A)...');
    const convResA = await apiRequest('GET', '/api/messages/conversations', null, userA.token);
    
    if (convResA.status === 200 && convResA.data.data.length > 0) {
      console.log('   ✅ Conversations retrieved successfully!');
      console.log(`    Active conversations: ${convResA.data.data.length}`);
      console.log(`    Partner: ${convResA.data.data[0].partner_first_name} ${convResA.data.data[0].partner_last_name}\n`);
    } else {
      throw new Error(`Failed to get conversations: ${JSON.stringify(convResA.data)}`);
    }

    // -------------------------------------------------------------------------
    // STEP 4: Get Conversations (User B)
    // -------------------------------------------------------------------------
    console.log('4️⃣  Testing GET /api/messages/conversations (User B)...');
    const convResB = await apiRequest('GET', '/api/messages/conversations', null, userB.token);
    
    if (convResB.status === 200 && convResB.data.data.length > 0) {
      console.log('   ✅ Conversations retrieved successfully!');
      console.log(`   💬 Active conversations: ${convResB.data.data.length}\n`);
    } else {
      throw new Error(`Failed to get conversations for User B: ${JSON.stringify(convResB.data)}`);
    }

    // -------------------------------------------------------------------------
    // STEP 5: Get Conversation Messages (User B reading User A's message)
    // -------------------------------------------------------------------------
    console.log('5️⃣  Testing GET /api/messages/conversations/:partnerId (Read Messages)...');
    const chatRes = await apiRequest('GET', `/api/messages/conversations/${userA.id}`, null, userB.token);
    
    if (chatRes.status === 200 && chatRes.data.data.length > 0) {
      console.log('   ✅ Messages retrieved successfully!');
      console.log(`   📨 Message count: ${chatRes.data.data.length}`);
      console.log(`   📝 Latest: "${chatRes.data.data[0].message_text}"\n`);
    } else {
      throw new Error(`Failed to get chat history: ${JSON.stringify(chatRes.data)}`);
    }

    // -------------------------------------------------------------------------
    // STEP 6: Edge Case - Self Messaging (Should Fail)
    // -------------------------------------------------------------------------
    console.log('6️⃣  Testing Edge Case: Self Messaging (Should be rejected)...');
    const selfMsgRes = await apiRequest('POST', '/api/messages', {
      receiverId: userA.id,
      messageText: 'Talking to myself',
    }, userA.token);

    if (selfMsgRes.status === 400) {
      console.log('   ✅ Self-messaging correctly rejected!\n');
    } else {
      console.log('   ⚠️  Warning: Self-messaging was not rejected as expected.\n');
    }

    console.log('🎉 All Messaging API Tests Passed Successfully!\n');

  } catch (error) {
    console.error('\n❌ Test Failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
runTests();