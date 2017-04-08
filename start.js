
const fs = require('fs');
const tangler = require('tangler');
const path = require('path');

const envPath = '.env';

// load env vars from `envPath` if possible
if (fs.existsSync(envPath)) {
	const envFile = fs.readFileSync(envPath, 'utf8');

	for (let line of envFile.split('\n')) {
		if (line.trim() === '')
			continue;

		const [name, val] = line.split('=');
		if (process.env.hasOwnProperty(val))
			process.env[name] = process.env[val];
		else
			process.env[name] = val;
	}
}

// for better error reporting
process.on('uncaughtException', (err) => {
    console.log(tangler.transformStack(err.stack));
    process.exit(1);
});

tangler
	.require(path.resolve('lib/server.js'))
	.default();
