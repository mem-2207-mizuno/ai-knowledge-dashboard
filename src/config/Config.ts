/**
 * アプリケーション設定
 */
export const Config = {
  /**
   * スプレッドシートIDを取得（Script Propertiesから）
   */
  getSpreadsheetId: (): string => {
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!spreadsheetId) {
      throw new Error(
        'SPREADSHEET_IDが設定されていません。GASエディタの「プロジェクトの設定」→「スクリプト プロパティ」から設定してください。',
      );
    }
    // 前後の空白を削除
    return spreadsheetId.trim();
  },
};
