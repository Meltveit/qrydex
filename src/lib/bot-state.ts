import fs from 'fs';
import path from 'path';

const STATE_FILE = path.resolve(process.cwd(), '.bot-states.json');

interface BotState {
    [key: string]: any;
}

function loadAllStates(): BotState {
    try {
        if (!fs.existsSync(STATE_FILE)) {
            return {};
        }
        const data = fs.readFileSync(STATE_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Failed to load bot states:', error);
        return {};
    }
}

export function loadBotState(botName: string, defaultState: any = {}) {
    const all = loadAllStates();
    return all[botName] || defaultState;
}

export function saveBotState(botName: string, state: any) {
    try {
        const all = loadAllStates();
        all[botName] = state;
        fs.writeFileSync(STATE_FILE, JSON.stringify(all, null, 2), 'utf-8');
    } catch (error) {
        console.error(`Failed to save state for ${botName}:`, error);
    }
}
