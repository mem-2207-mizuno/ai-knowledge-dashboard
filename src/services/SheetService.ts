import { Config } from '../config/Config';

export class SheetService {
  /**
   * スプレッドシートを安全に開く
   */
  static openSpreadsheet(): GoogleAppsScript.Spreadsheet.Spreadsheet {
    const spreadsheetId = Config.getSpreadsheetId();

    try {
      // まずIDが有効な形式か確認
      if (!spreadsheetId || spreadsheetId.trim().length === 0) {
        throw new Error('スプレッドシートIDが空です');
      }

      // スプレッドシートを開く
      const spreadsheet = SpreadsheetApp.openById(spreadsheetId.trim());

      return spreadsheet;
    } catch (error: any) {
      const errorMessage = error?.toString() || 'Unknown error';
      console.error('Error opening spreadsheet:', errorMessage);

      // より詳細なエラーメッセージ
      let detailedError = `スプレッドシートを開けませんでした。\n`;
      detailedError += `エラー: ${errorMessage}\n\n`;
      detailedError += `確認事項:\n`;
      detailedError += `1. スプレッドシートIDが正しいか確認してください\n`;
      detailedError += `2. スプレッドシートが存在するか確認してください\n`;
      detailedError += `3. デプロイ時の実行ユーザーがスプレッドシートにアクセスできるか確認してください\n`;
      detailedError += `4. スプレッドシートの共有設定を確認してください`;

      throw new Error(detailedError);
    }
  }

  /**
   * デバッグ用: スプレッドシートへのアクセステスト
   */
  static testAccess(): string {
    try {
      const spreadsheetId = Config.getSpreadsheetId();
      const spreadsheet = this.openSpreadsheet();
      const name = spreadsheet.getName();
      return `Success! Spreadsheet ID: ${spreadsheetId}, Name: ${name}`;
    } catch (error: any) {
      return `Error: ${error.toString()}`;
    }
  }
}
