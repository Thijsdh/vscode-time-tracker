import * as vscode from 'vscode';
import * as moment from 'moment';
import TimeTrackerStatusBar from './TimeTrackerStatusBar';
import Timer from './Timer';

let timeTracker: TimeTracker;

export function activate(context: vscode.ExtensionContext) {
	function registerCommand(commandId: string, run: (...args: any[]) => void) {
		context.subscriptions.push(
			vscode.commands.registerCommand(commandId, run)
		);
	}

	timeTracker = new TimeTracker(context);

	registerCommand('timeTracker.start', () => {
		timeTracker.timer.start();
	});
	registerCommand('timeTracker.toggle', async () => {
		await timeTracker.timer.toggle();
	});
	registerCommand('timeTracker.setDescription', async () => {
		const input = await vscode.window.showInputBox();
		if (typeof input === 'undefined') return; // Input cancelled by user
		timeTracker.timer.description = input;
	});
	registerCommand('timeTracker.stop', async () => {
		await timeTracker.timer.stop();
	});
}

export async function deactivate() {
	await timeTracker.timer.stop();
}

class TimeTracker {
	private _statusBar: TimeTrackerStatusBar;
	public timer: Timer;

	constructor(context: vscode.ExtensionContext) {
		this.timer = new Timer(context);
		this._statusBar = new TimeTrackerStatusBar(context, this.timer);
		vscode.workspace.onDidChangeTextDocument(e => {
			this.timer.lastEdit = moment();
		});
	}
}
