import * as moment from 'moment';
import * as vscode from 'vscode';
import FileUtils from './FileUtils';
import { promises as fs } from 'fs';

export enum TimerStatus {
	STOPPED,
	PAUSED,
	RUNNING
}

export default class Timer {
	private workspaceConfig = vscode.workspace.getConfiguration('timetracker');
	private config = {
		inactivityTimeout:
			this.workspaceConfig.get('inactivityTimeout', 10) * 60,
		minimumLogTime: this.workspaceConfig.get('minimumLogTime', 1) * 60
	};

	private _context: vscode.ExtensionContext;
	private _description = '';
	private _lastEdit = moment();
	private _startedAt = moment();
	private _status = TimerStatus.STOPPED;
	private _timer?: NodeJS.Timer = undefined;
	private _updateCallbacks: ((
		duration: moment.Duration,
		status: TimerStatus
	) => void)[] = [];

	constructor(context: vscode.ExtensionContext) {
		this._context = context;

		this.status =
			context.workspaceState.get('timer_status') || TimerStatus.STOPPED;
		if (this.status === TimerStatus.RUNNING) this.start();

		FileUtils.readPreviousDescription().then(value => {
			this._description = value;
		});
	}

	public set description(value: string) {
		const prevStatus = this._status;
		new Promise((resolve, reject) => {
			if (prevStatus !== TimerStatus.STOPPED) {
				this.stop(true).then(() => {
					resolve();
				});
			} else {
				resolve();
			}
		}).then(() => {
			this._description = value;
			if (prevStatus === TimerStatus.RUNNING) this.start(true);
			else if (prevStatus === TimerStatus.PAUSED) this.pause(true);
		});
	}

	public get duration() {
		return moment.duration(moment().diff(this._startedAt));
	}

	public get lastEdit() {
		return this._lastEdit;
	}

	public set lastEdit(value: moment.Moment) {
		this._lastEdit = value;
		if (this._status === TimerStatus.PAUSED) this.start();
	}

	public get status() {
		return this._status;
	}

	public set status(value) {
		this._status = value;
		this.callUpdateCallbacks();
		this._context.workspaceState.update('timer_status', value);
	}

	public get startedAt() {
		return this._startedAt;
	}

	/**
	 * Start the timer.
	 * @param silent Whether we should display information messages to the user or not.
	 */
	public start(silent: boolean = false) {
		this._startedAt = moment();
		this.status = TimerStatus.RUNNING;
		this._timer = setInterval(() => {
			this.callUpdateCallbacks();
			const secondsSinceLastEdit = moment
				.duration(moment().diff(this._lastEdit))
				.asSeconds();
			if (secondsSinceLastEdit > this.config.inactivityTimeout)
				this.pause();
		}, 1000);
		if (!silent)
			vscode.window.showInformationMessage('Started time tracking');
	}

	/**
	 * Pause the timer.
	 *
	 * When the timer is paused, it will write the current time to the log minus the inactivity timeout.
	 * The timer will automatically restart if the user starts typing.
	 *
	 * @param silent Whether we should display information messages to the user or not.
	 */
	public async pause(silent: boolean = false) {
		await this.writeToLog(
			moment.duration(
				this.duration.asSeconds() - this.config.inactivityTimeout,
				'seconds'
			)
		);
		this.status = TimerStatus.PAUSED;
		if (typeof this._timer !== 'undefined') clearInterval(this._timer);

		if (!silent)
			vscode.window.showInformationMessage('Paused time tracking');
	}

	/**
	 * Stop the timer.
	 * @param silent Whether we should display information messages to the user or not.
	 */
	public async stop(silent: boolean = false) {
		await this.writeToLog();
		this.status = TimerStatus.STOPPED;
		if (typeof this._timer !== 'undefined') clearInterval(this._timer);

		if (!silent)
			vscode.window.showInformationMessage('Stopped time tracking');
	}

	/**
	 * Toggles the timer.
	 *
	 * Starts timer if it is stopped, stops timer if it is paused or running.
	 */
	public async toggle() {
		if (this._status === TimerStatus.STOPPED) this.start();
		else await this.stop();
	}

	/**
	 * Write the recorded time with description to the time log file.
	 */
	public async writeToLog(duration?: moment.Duration) {
		if (this._status === TimerStatus.STOPPED)
			return vscode.window.showErrorMessage('Timer not running');

		const minutes = duration
			? duration.asMinutes()
			: this.duration.asMinutes();

		// Don't write sessions shorter than one minute to the file.
		if (minutes * 60 > this.config.minimumLogTime) {
			const line = [
				this._startedAt.toISOString(),
				moment().toISOString(),
				Math.round(minutes),
				this._description
			].join(',');

			const filePath = FileUtils.trackingFilePath;
			if (filePath === null) return;
			try {
				await fs.appendFile(filePath, line + '\n');
			} catch (err) {
				console.error(err);
				return vscode.window.showErrorMessage(
					'An error occurred while creating the time tracking file'
				);
			}
		}
	}

	/**
	 * Registers a new callback to the timer.
	 * @param callback The callback which is called every second and when the timer status changes.
	 */
	public registerUpdateCallback(
		callback: (duration: moment.Duration, status: TimerStatus) => void
	) {
		this._updateCallbacks.push(callback);
	}

	/**
	 * Call all registered updateCallbacks.
	 * @see Timer.registerUpdateCallback()
	 */
	private callUpdateCallbacks() {
		for (let updateCallback of this._updateCallbacks) {
			updateCallback(this.duration, this._status);
		}
	}
}
