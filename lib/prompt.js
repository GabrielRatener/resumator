
import readline from 'readline'

export function prompt(question, callback) {
	let r = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});

	r.question(question, function(answer) {
		r.close();
		callback(null, answer);
	});
}