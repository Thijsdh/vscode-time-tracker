import * as vscode from 'vscode';
import * as path from 'path';
import { promises as fs } from 'fs';

export default class FileUtils {
	/**
	 * The path of the tracking file.
	 * @return Path of the tracking file as a string or null if there is no workspace opened.
	 */
	public static get trackingFilePath() {
		const workspaceConfig = vscode.workspace.getConfiguration(
			'timetracker'
		);
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (
			typeof workspaceFolders === 'undefined' ||
			workspaceFolders.length === 0
		) {
			vscode.window.showErrorMessage('No workspace folder found');
			return null;
		}
		return path.join(
			workspaceFolders[0].uri.fsPath,
			workspaceConfig.get('logFilePath', '.time.csv')
		);
	}

	/**
	 * Reads the description form the previous time registration from the output file.
	 * Throws exception if no previous description is found.
	 */
	public static async readPreviousDescription() {
		const filePath = FileUtils.trackingFilePath;
		if (filePath === null) throw new Error('Time tracking file not found');
		const content = await fs.readFile(filePath, 'utf8');

		const descriptionRegex = /((\w|\s)+)(\n+)?$/g;
		const match = content.match(descriptionRegex);

		if (match === null) throw new Error('No previous description found');
		return match[0].replace('\n', '');
	}
}
