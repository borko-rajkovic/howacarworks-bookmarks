/**
 * injectScript - Inject internal script to available access to the `window`
 *
 * @param  {type} file_path Local path of the internal script.
 * @param  {type} tag The tag as string, where the script will be append (default: 'body').
 * @see    {@link http://stackoverflow.com/questions/20499994/access-window-variable-from-content-script}
 */
function injectScript(file_path, tag = 'body') {
  var node = document.getElementsByTagName(tag)[0];
  var script = document.createElement('script');
  script.setAttribute('type', 'text/javascript');
  script.setAttribute('src', file_path);
  node.appendChild(script);
}

function addStyle(url) {
  var css = document.createElement('link');
  css.rel = 'stylesheet';
  css.crossOrigin = 'anonymous';

  css.href = url;

  document.getElementsByTagName('head')[0].appendChild(css);
}

injectScript(chrome.runtime.getURL('firebase-app.js'));
injectScript(chrome.runtime.getURL('firebase-firestore.js'));
injectScript(chrome.runtime.getURL('main.js'));

addStyle(
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.11.2/css/all.min.css'
);
