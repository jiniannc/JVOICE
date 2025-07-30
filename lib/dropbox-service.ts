import axios from "axios";

class DropboxService {
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  private async refreshToken(): Promise<void> {
    console.log("🔄 [DropboxService] 토큰 갱신 시도...");
    try {
      const refreshToken = process.env.DROPBOX_REFRESH_TOKEN;
      const dropboxAppKey = process.env.DROPBOX_APP_KEY;
      const dropboxAppSecret = process.env.DROPBOX_APP_SECRET;

      if (!refreshToken || !dropboxAppKey || !dropboxAppSecret) {
        throw new Error("Dropbox 앱 설정(토큰/키/시크릿)이 누락되었습니다.");
      }

      const response = await axios.post(
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

    const response = await axios.post(
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

    const response = await axios.post(
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
    const response = await axios.post(
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
    const response = await axios.post(
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
     // 안정성을 위해 짧은 지연 추가
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const response = await axios.post(
      "https://api.dropboxapi.com/2/files/move_v2",
      { from_path: from, to_path: to, autorename: false },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  }

  // index.json 읽기 (rev 포함)
  public async getIndexJson({ path }: { path: string }): Promise<{ entries: any[], rev: string }> {
    const token = await this.getAccessToken();
    const response = await axios.post(
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
    const response = await axios.post(
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