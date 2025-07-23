"use client"

// 회사 컴퓨터 감지 서비스
export class DeviceDetector {
  private companyNetworkRanges = [
    // 회사 IP 대역 (예시 - 실제 회사 IP로 변경 필요)
    "192.168.1.", // 내부 네트워크
    "10.0.0.", // 내부 네트워크
    "172.16.", // 내부 네트워크
  ]

  private companyDomains = ["jinair.com", "company.local"]

  // 현재 디바이스가 회사 컴퓨터인지 확인
  async isCompanyDevice(): Promise<{ isCompany: boolean; reason: string; details: any }> {
    const checks = {
      network: await this.checkNetworkLocation(),
      browser: this.checkBrowserEnvironment(),
      domain: this.checkDomainAccess(),
      userAgent: this.checkUserAgent(),
    }

    // 하나라도 회사 환경으로 판단되면 허용
    const isCompany = checks.network.isCompany || checks.browser.isCompany || checks.domain.isCompany

    return {
      isCompany,
      reason: isCompany ? "회사 환경에서 접속" : "개인 환경에서 접속",
      details: checks,
    }
  }

  // 네트워크 위치 확인 (IP 기반)
  private async checkNetworkLocation(): Promise<{ isCompany: boolean; ip?: string; location?: string }> {
    try {
      // 공개 IP 확인 서비스 사용
      const response = await fetch("https://api.ipify.org?format=json")
      const data = await response.json()
      const publicIP = data.ip

      // 내부 IP도 확인 (WebRTC 사용)
      const localIP = await this.getLocalIP()

      // 회사 IP 대역 확인
      const isCompanyNetwork = this.companyNetworkRanges.some(
        (range) => localIP?.startsWith(range) || publicIP?.startsWith(range),
      )

      return {
        isCompany: isCompanyNetwork,
        ip: publicIP,
        location: localIP,
      }
    } catch (error) {
      console.warn("네트워크 확인 실패:", error)
      return { isCompany: false }
    }
  }

  // 로컬 IP 가져오기 (WebRTC 사용)
  private getLocalIP(): Promise<string | null> {
    return new Promise((resolve) => {
      try {
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        })

        pc.createDataChannel("")
        pc.createOffer().then((offer) => pc.setLocalDescription(offer))

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            const candidate = event.candidate.candidate
            const ipMatch = candidate.match(/(\d+\.\d+\.\d+\.\d+)/)
            if (ipMatch) {
              resolve(ipMatch[1])
              pc.close()
            }
          }
        }

        // 타임아웃
        setTimeout(() => {
          pc.close()
          resolve(null)
        }, 3000)
      } catch (error) {
        resolve(null)
      }
    })
  }

  // 브라우저 환경 확인
  private checkBrowserEnvironment(): { isCompany: boolean; details: any } {
    const userAgent = navigator.userAgent
    const platform = navigator.platform
    const language = navigator.language

    // 회사에서 주로 사용하는 브라우저/OS 패턴
    const companyPatterns = [
      /Windows NT.*Chrome/i, // 회사 Windows + Chrome
      /Macintosh.*Chrome/i, // 회사 Mac + Chrome
      /corporate/i, // 기업용 브라우저 식별자
    ]

    const isCompanyBrowser = companyPatterns.some((pattern) => pattern.test(userAgent))

    return {
      isCompany: isCompanyBrowser,
      details: {
        userAgent,
        platform,
        language,
        screen: `${screen.width}x${screen.height}`,
      },
    }
  }

  // 도메인 접근 확인
  private checkDomainAccess(): { isCompany: boolean; domain: string } {
    const hostname = window.location.hostname
    const isCompanyDomain = this.companyDomains.some((domain) => hostname.includes(domain) || hostname.endsWith(domain))

    return {
      isCompany: isCompanyDomain,
      domain: hostname,
    }
  }

  // User Agent 상세 분석
  private checkUserAgent(): { isCompany: boolean; details: any } {
    const ua = navigator.userAgent

    // 회사 관리 소프트웨어 흔적 확인
    const managementSoftware = ["CorporateAgent", "EnterpriseManaged", "DomainJoined"]

    const hasManagementSoftware = managementSoftware.some((software) => ua.includes(software))

    return {
      isCompany: hasManagementSoftware,
      details: {
        userAgent: ua,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
      },
    }
  }

  // 간단한 회사 환경 확인 (관리자가 설정 가능)
  checkSimpleCompanyEnvironment(): { isCompany: boolean; reason: string } {
    // localStorage에 회사 컴퓨터 마킹이 있는지 확인
    const isMarkedAsCompany = localStorage.getItem("isCompanyDevice") === "true"

    if (isMarkedAsCompany) {
      return { isCompany: true, reason: "관리자가 회사 컴퓨터로 등록" }
    }

    // 현재 시간이 업무시간인지 확인 (간단한 방법)
    const now = new Date()
    const hour = now.getHours()
    const isBusinessHour = hour >= 9 && hour <= 18
    const isWeekday = now.getDay() >= 1 && now.getDay() <= 5

    if (isBusinessHour && isWeekday) {
      return { isCompany: true, reason: "업무시간 중 접속" }
    }

    return { isCompany: false, reason: "개인 환경으로 판단" }
  }
}

// 싱글톤 인스턴스
export const deviceDetector = new DeviceDetector()
