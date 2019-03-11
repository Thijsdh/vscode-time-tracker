import * as vscode from 'vscode';
import * as moment from 'moment';
import Timer, { TimerStatus } from './Timer';

export default class TimeTrackerStatusBar {
	private _statusBar: vscode.StatusBarItem;

	constructor(context: vscode.ExtensionContext, timer: Timer) {
		this._statusBar = vscode.window.createStatusBarItem(
			vscode.StatusBarAlignment.Right,
			100
		);
		this._statusBar.command = 'timeTracker.toggle';
		context.subscriptions.push(this._statusBar);
		this.show();
		// Register the update callback, bound to this class so that we can access the text property
		timer.registerUpdateCallback(this.update.bind(this));
	}

	private set text(value: string) {
		this._statusBar.text = `$(clock) ${value}`;
	}

	/**
	 * Update the content of the status bar.
	 * @param duration The current duration of the timer
	 * @param timerStatus The current status of the timer
	 */
	public update(duration: moment.Duration, timerStatus: TimerStatus) {
		try {
			const time = moment.utc(duration.asMilliseconds()).format('HH:mm');
			if (timerStatus === TimerStatus.RUNNING) this.text = time;
			else if (timerStatus === TimerStatus.PAUSED)
				this.text = time + ' (Timer paused)';
			else this.text = 'Timer Stopped';
		} catch (e) {
			console.error(e);
		}
	}

	/**
	 * Show the status bar.
	 */
	public show() {
		this._statusBar.show();
		this.update(moment.duration(0), TimerStatus.STOPPED);
	}

	/**
	 * Hide the status bar.
	 */
	public hide() {
		this._statusBar.hide();
	}
}
