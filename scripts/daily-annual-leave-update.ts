import { runDailyAnnualLeaveUpdate } from "@/lib/annual-leave-policy"

// 일일 연차 업데이트 스크립트
// 이 스크립트는 매일 0시에 실행되어야 합니다.
// cron job이나 스케줄러를 통해 실행할 수 있습니다.

async function main() {
  console.log("=== 일일 연차 업데이트 시작 ===")
  console.log("실행 시간:", new Date().toISOString())

  try {
    const results = await runDailyAnnualLeaveUpdate()

    console.log("=== 업데이트 결과 ===")
    console.log(`처리된 구성원 수: ${results.processed}명`)
    console.log(`부여된 연차: ${results.granted}일`)
    console.log(`소멸된 연차: ${results.expired}일`)

    if (results.errors.length > 0) {
      console.log("=== 오류 목록 ===")
      results.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`)
      })
    }

    console.log("=== 일일 연차 업데이트 완료 ===")

    // 성공 시 종료 코드 0
    process.exit(0)
  } catch (error) {
    console.error("=== 일일 연차 업데이트 실패 ===")
    console.error("오류:", error)

    // 실패 시 종료 코드 1
    process.exit(1)
  }
}

// 스크립트가 직접 실행될 때만 main 함수 호출
if (require.main === module) {
  main()
}

export { main as runDailyUpdate }
