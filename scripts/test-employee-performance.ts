/**
 * Phase 2 성능 테스트 스크립트
 * Google Sheets vs Railway DB 성능 비교
 * 
 * 실행 방법:
 * npx ts-node scripts/test-employee-performance.ts
 */

import { EmployeeDatabase } from '../lib/employee-database';

async function testPerformance() {
  console.log('🏁 Phase 2 성능 테스트 시작\n');
  console.log('=' .repeat(60));
  
  const employeeDB = new EmployeeDatabase();
  
  // Test 1: Google Sheets 속도
  console.log('\n📋 Test 1: Google Sheets 조회');
  console.log('-'.repeat(60));
  const sheetsStart = Date.now();
  try {
    const sheetsData = await employeeDB.fetchEmployeesFromSheets();
    const sheetsTime = Date.now() - sheetsStart;
    console.log(`✅ 성공: ${sheetsData.length}명`);
    console.log(`⏱️  소요 시간: ${sheetsTime}ms`);
    console.log(`📊 평균: ${(sheetsTime / sheetsData.length).toFixed(2)}ms/명`);
  } catch (error) {
    console.error(`❌ 실패:`, error);
  }
  
  // Test 2: Railway DB 속도
  console.log('\n📊 Test 2: Railway DB 조회');
  console.log('-'.repeat(60));
  const dbStart = Date.now();
  try {
    const dbData = await employeeDB.fetchEmployeesFromDB();
    const dbTime = Date.now() - dbStart;
    console.log(`✅ 성공: ${dbData.length}명`);
    console.log(`⏱️  소요 시간: ${dbTime}ms`);
    console.log(`📊 평균: ${(dbTime / dbData.length).toFixed(2)}ms/명`);
    
    // 비교
    if (sheetsStart !== dbStart) { // sheetsData가 성공했다면
      const improvement = (((sheetsTime - dbTime) / sheetsTime) * 100).toFixed(1);
      console.log('\n' + '='.repeat(60));
      console.log(`✨ 성능 개선: DB가 ${improvement}% 더 빠름!`);
      console.log(`💡 속도 차이: ${sheetsTime - dbTime}ms`);
    }
  } catch (error) {
    console.error(`❌ 실패:`, error);
  }
  
  // Test 3: 동시 접속 테스트
  console.log('\n\n👥 Test 3: 동시 접속 테스트 (10명)');
  console.log('-'.repeat(60));
  const concurrentStart = Date.now();
  try {
    const promises = Array(10).fill(null).map(() => 
      employeeDB.fetchEmployeesFromDB()
    );
    await Promise.all(promises);
    const concurrentTime = Date.now() - concurrentStart;
    console.log(`✅ 10명 동시 조회 완료`);
    console.log(`⏱️  총 시간: ${concurrentTime}ms`);
    console.log(`📊 평균 응답: ${(concurrentTime / 10).toFixed(1)}ms`);
  } catch (error) {
    console.error(`❌ 실패:`, error);
  }
  
  // Test 4: 데이터 정합성 확인
  console.log('\n\n🔍 Test 4: 데이터 정합성 확인');
  console.log('-'.repeat(60));
  try {
    const sheetsData = await employeeDB.fetchEmployeesFromSheets();
    const dbData = await employeeDB.fetchEmployeesFromDB();
    
    console.log(`📋 Sheets: ${sheetsData.length}명`);
    console.log(`📊 DB: ${dbData.length}명`);
    
    if (sheetsData.length === dbData.length) {
      console.log(`✅ 데이터 개수 일치!`);
    } else {
      console.log(`⚠️  데이터 개수 불일치! (차이: ${Math.abs(sheetsData.length - dbData.length)}명)`);
    }
    
    // 샘플 데이터 비교
    const sheetsSample = sheetsData.slice(0, 5);
    const dbSample = dbData.slice(0, 5);
    
    console.log('\n📝 샘플 데이터 (첫 5명):');
    sheetsSample.forEach((emp, i) => {
      const dbEmp = dbSample.find(d => d.employeeId === emp.employeeId);
      const match = dbEmp ? '✅' : '❌';
      console.log(`  ${match} ${emp.name} (${emp.employeeId})`);
    });
  } catch (error) {
    console.error(`❌ 실패:`, error);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 테스트 완료!\n');
}

// 메모리 사용량 모니터링
function printMemoryUsage() {
  const usage = process.memoryUsage();
  console.log('\n💾 메모리 사용량:');
  console.log(`  Heap Used: ${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Total: ${(usage.heapTotal / 1024 / 1024).toFixed(2)} MB`);
}

// 실행
testPerformance()
  .then(() => {
    printMemoryUsage();
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 테스트 실행 실패:', error);
    process.exit(1);
  });


