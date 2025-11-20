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
   * 指定した名前のシートを取得し、存在しなければ作成する。
   * 必要なヘッダー行も保証する。
   */
  static getOrCreateSheet(
    sheetName: string,
    headers: string[],
    spreadsheet?: GoogleAppsScript.Spreadsheet.Spreadsheet
  ): GoogleAppsScript.Spreadsheet.Sheet {
    const book = spreadsheet || this.openSpreadsheet();
    let sheet = book.getSheetByName(sheetName);

    if (!sheet) {
      sheet = book.insertSheet(sheetName);
    }

    // シートの列数が不足している場合は追加
    if (sheet.getMaxColumns() < headers.length) {
      sheet.insertColumnsAfter(
        sheet.getMaxColumns(),
        headers.length - sheet.getMaxColumns()
      );
    }

    // ヘッダーを設定（既存と異なる場合も上書きして仕様通りに揃える）
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    const currentHeaders = headerRange.getValues()[0];
    let needsUpdate = currentHeaders.length === 0;

    if (!needsUpdate) {
      needsUpdate = headers.some((header, index) => currentHeaders[index] !== header);
    }

    if (needsUpdate) {
      headerRange.setValues([headers]);
    }

    return sheet;
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
