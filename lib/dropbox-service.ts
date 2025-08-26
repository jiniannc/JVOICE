import axios from "axios";

// HTTP 연결 풀링을 위한 axios 인스턴스 생성
const axiosInstance = axios.create({
  timeout: 10000, // 10초 타임아웃
  maxRedirects: 5,
  // 연결 풀링 설정
  httpAgent: new (require('http').Agent)({
    keepAlive: true,
    maxSockets: 10,
    maxFreeSockets: 5,
    timeout: 60000,
  }),
  httpsAgent: new (require('https').Agent)({
    keepAlive: true,
    maxSockets: 10,
    maxFreeSockets: 5,
    timeout: 60000,
  }),
});

class DropboxService {
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private isRefreshing: boolean = false;

  private async refreshToken(): Promise<void> {
    // 토큰 갱신 중복 방지
    if (this.isRefreshing) {
      console.log("⏳ [DropboxService] 토큰 갱신 중... 대기");
      // 갱신 완료까지 대기
      while (this.isRefreshing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    this.isRefreshing = true;
    console.log("🔄 [DropboxService] 토큰 갱신 시도...");
    
    try {
      const refreshToken = process.env.DROPBOX_REFRESH_TOKEN;
      const dropboxAppKey = process.env.DROPBOX_APP_KEY;
      const dropboxAppSecret = process.env.DROPBOX_APP_SECRET;

      if (!refreshToken || !dropboxAppKey || !dropboxAppSecret) {
        throw new Error("Dropbox 앱 설정(토큰/키/시크릿)이 누락되었습니다.");
      }

      const response = await axiosInstance.post(
        "https://api.dropbox.com/oauth2/token",
        new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: dropboxAppKey,
          client_secret: dropboxAppSecret,
        })
      );

      if (response.status === 200) {
        this.accessToken = response.data.access_token;
        // Dropbox 기본 만료 시간은 4시간 (14400초)
        const expiresIn = response.data.expires_in || 14400;
        // 만료 5분 전에 갱신하도록 설정
        this.tokenExpiresAt = Date.now() + (expiresIn - 300) * 1000;
        console.log("✅ [DropboxService] 토큰 갱신 및 캐싱 성공.");
      } else {
        throw new Error(`토큰 갱신 실패 (상태 코드: ${response.status})`);
      }
    } catch (error: any) {
      console.error(
        "❌ [DropboxService] 토큰 갱신 중 심각한 오류 발생:",
        error.response?.data || error.message
      );
      this.accessToken = null;
      this.tokenExpiresAt = 0;
      throw error; // 오류를 다시 던져서 호출한 쪽에서 처리하도록 함
    } finally {
      this.isRefreshing = false;
    }
  }

  public async getAccessToken(): Promise<string> {
    if (!this.accessToken || Date.now() >= this.tokenExpiresAt) {
      await this.refreshToken();
    }
    return this.accessToken!;
  }

  private createApiArg(args: any): string {
    const jsonString = JSON.stringify(args);
    // 유니코드 이스케이프
    return jsonString.replace(/[\u007F-\uFFFF]/g, function (ch) {
      return "\\u" + ("0000" + ch.charCodeAt(0).toString(16)).slice(-4);
    });
  }

  public async upload({ path, content }: { path: string; content: Buffer; }): Promise<any> {
    const token = await this.getAccessToken();
    const apiArgs = {
      path,
      mode: "add",
      autorename: true,
      mute: false,
    };

    const response = await axiosInstance.post(
      "https://content.dropboxapi.com/2/files/upload",
      content,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/octet-stream",
          "Dropbox-API-Arg": this.createApiArg(apiArgs),
        },
      }
    );
    return response.data;
  }
  
  public async overwrite({ path, content }: { path: string; content: Buffer; }): Promise<any> {
    const token = await this.getAccessToken();
    const apiArgs = {
      path,
      mode: "overwrite",
      autorename: false,
      mute: false,
    };

    const response = await axiosInstance.post(
      "https://content.dropboxapi.com/2/files/upload",
      content,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/octet-stream",
          "Dropbox-API-Arg": this.createApiArg(apiArgs),
        },
      }
    );
    return response.data;
  }

  public async listFolder({ path }: { path: string; }): Promise<any[]> {
    const token = await this.getAccessToken();
    const response = await axiosInstance.post(
      "https://api.dropboxapi.com/2/files/list_folder",
      { path, recursive: false },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data.entries || [];
  }

  public async download({ path }: { path: string; }): Promise<string> {
    const token = await this.getAccessToken();
    const response = await axiosInstance.post(
      "https://content.dropboxapi.com/2/files/download",
      "",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Dropbox-API-Arg": JSON.stringify({ path }),
          "Content-Type": "application/octet-stream",
        },
        responseType: "text",
      }
    );
    return response.data; // JSON.parse() 제거 - 원본 텍스트 반환
  }

  public async move({ from, to }: { from: string; to: string; }): Promise<any> {
    const token = await this.getAccessToken();
    
    console.log("🔄 [DropboxService] 파일 이동 시도:", { from, to });
    
    // 안정성을 위해 짧은 지연 추가
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      const response = await axiosInstance.post(
        "https://api.dropboxapi.com/2/files/move_v2",
        { from_path: from, to_path: to, autorename: false },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      
      console.log("✅ [DropboxService] 파일 이동 성공:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("❌ [DropboxService] 파일 이동 실패:", {
        from,
        to,
        error: error.response?.data || error.message
      });
      throw error;
    }
  }

  public async copy({ from, to }: { from: string; to: string; }): Promise<any> {
    const token = await this.getAccessToken();
    
    console.log("🔄 [DropboxService] 파일 복사 시도:", { from, to });
    
    try {
      const response = await axiosInstance.post(
        "https://api.dropboxapi.com/2/files/copy_v2",
        { from_path: from, to_path: to, autorename: false },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      
      console.log("✅ [DropboxService] 파일 복사 성공:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("❌ [DropboxService] 파일 복사 실패:", {
        from,
        to,
        error: error.response?.data || error.message
      });
      throw error;
    }
  }

  public async delete({ path }: { path: string; }): Promise<any> {
    const token = await this.getAccessToken();
    
    console.log("🔄 [DropboxService] 파일 삭제 시도:", { path });
    
    try {
      const response = await axiosInstance.post(
        "https://api.dropboxapi.com/2/files/delete_v2",
        { path },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      
      console.log("✅ [DropboxService] 파일 삭제 성공:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("❌ [DropboxService] 파일 삭제 실패:", {
        path,
        error: error.response?.data || error.message
      });
      throw error;
    }
  }

  // index.json 읽기 (rev 포함)
  public async getIndexJson({ path }: { path: string }): Promise<{ entries: any[], rev: string }> {
    const token = await this.getAccessToken();
    const response = await axiosInstance.post(
      "https://content.dropboxapi.com/2/files/download",
      "",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Dropbox-API-Arg": JSON.stringify({ path }),
          "Content-Type": "application/octet-stream",
        },
        responseType: "text",
      }
    );
    const rev = response.headers["dropbox-api-result"]
      ? JSON.parse(response.headers["dropbox-api-result"]).rev
      : undefined;
    return { entries: JSON.parse(response.data), rev }; // 여기는 올바른 JSON 파싱
  }

  // index.json overwrite (rev 체크)
  public async overwriteIndexJson({ path, content, rev }: { path: string; content: Buffer; rev: string }): Promise<any> {
    const token = await this.getAccessToken();
    const apiArgs = {
      path,
      mode: { ".tag": "update", update: rev },
      autorename: false,
      mute: false,
    };
    const response = await axiosInstance.post(
      "https://content.dropboxapi.com/2/files/upload",
      content,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/octet-stream",
          "Dropbox-API-Arg": this.createApiArg(apiArgs),
        },
      }
    );
    return response.data;
  }
}

// 싱글턴 인스턴스 생성
const dropboxService = new DropboxService();
export default dropboxService; 