
import {chatModel} from './lib'

window.onload = function(e) {
	console.log(chatURL);
	chatModel.connect(chatURL);
}