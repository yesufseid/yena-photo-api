function getUploadPage(eventName, token) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Upload Photos - ${eventName.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#1a1a2e;color:#eee;min-height:100vh;display:flex;align-items:center;justify-content:center}
.container{max-width:500px;width:100%;padding:20px}
.card{background:#16213e;border-radius:16px;padding:30px;box-shadow:0 8px 32px rgba(0,0,0,0.3)}
h1{font-size:1.5rem;margin-bottom:8px;color:#fff}
.subtitle{color:#8899aa;margin-bottom:24px;font-size:0.9rem}
.drop-zone{border:2px dashed #334155;border-radius:12px;padding:40px 20px;text-align:center;cursor:pointer;transition:all 0.3s;margin-bottom:20px}
.drop-zone:hover,.drop-zone.dragover{border-color:#4f9cf7;background:rgba(79,156,247,0.08)}
.drop-zone.has-files{border-color:#22c55e;background:rgba(34,197,94,0.08)}
.drop-zone-icon{font-size:2.5rem;margin-bottom:12px}
.drop-zone-text{font-size:0.95rem;color:#8899aa}
.drop-zone-text strong{color:#4f9cf7}
.file-list{margin-bottom:20px}
.file-item{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#1e293b;border-radius:8px;margin-bottom:8px;font-size:0.85rem}
.file-item .name{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-right:12px}
.file-item .status{font-size:0.8rem;padding:2px 8px;border-radius:4px}
.status.pending{color:#8899aa}
.status.uploading{color:#4f9cf7}
.status.done{color:#22c55e}
.status.error{color:#ef4444}
.file-item .remove{cursor:pointer;color:#ef4444;margin-left:8px}
.btn{width:100%;padding:14px;border:none;border-radius:10px;font-size:1rem;font-weight:600;cursor:pointer;transition:all 0.2s}
.btn-primary{background:#4f9cf7;color:white}
.btn-primary:hover{background:#3b82f6}
.btn-primary:disabled{background:#334155;color:#64748b;cursor:not-allowed}
.progress-bar{height:4px;background:#1e293b;border-radius:2px;margin-top:16px;overflow:hidden}
.progress-bar-fill{height:100%;background:#4f9cf7;border-radius:2px;width:0%;transition:width 0.3s}
.hidden{display:none}
.complete-icon{font-size:3rem;margin-bottom:16px}
#complete{text-align:center}
#complete h2{margin-bottom:8px;color:#22c55e}
#complete p{color:#8899aa;font-size:0.9rem}
</style>
</head>
<body>
<div class="container">
  <div class="card" id="uploadCard">
    <h1>📸 ${eventName.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</h1>
    <p class="subtitle">Upload event photos</p>

    <div class="drop-zone" id="dropZone" onclick="document.getElementById('fileInput').click()">
      <div class="drop-zone-icon">📁</div>
      <div class="drop-zone-text">Drag & drop photos here or <strong>browse</strong></div>
    </div>
    <input type="file" id="fileInput" accept="image/*" multiple hidden />

    <div class="file-list" id="fileList"></div>

    <button class="btn btn-primary" id="uploadBtn" disabled onclick="startUpload()">
      Upload Photos
    </button>

    <div class="progress-bar" id="progressBar">
      <div class="progress-bar-fill" id="progressFill"></div>
    </div>
  </div>

  <div class="card hidden" id="complete">
    <div class="complete-icon">✅</div>
    <h2>All Uploaded!</h2>
    <p>You can close this page now.</p>
  </div>
</div>

<script>
var token = "${token}";
var files = [];
var dropZone = document.getElementById('dropZone');
var fileInput = document.getElementById('fileInput');
var fileList = document.getElementById('fileList');
var uploadBtn = document.getElementById('uploadBtn');
var progressFill = document.getElementById('progressFill');
var uploadCard = document.getElementById('uploadCard');
var completeDiv = document.getElementById('complete');

dropZone.addEventListener('dragover', function(e) { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', function() { dropZone.classList.remove('dragover'); });
dropZone.addEventListener('drop', function(e) { e.preventDefault(); dropZone.classList.remove('dragover'); addFiles(e.dataTransfer.files); });
fileInput.addEventListener('change', function() { addFiles(fileInput.files); });

function addFiles(newFiles) {
  for (var i = 0; i < newFiles.length; i++) {
    var f = newFiles[i];
    if (!f.type.startsWith('image/')) continue;
    var dup = false;
    for (var j = 0; j < files.length; j++) {
      if (files[j].name === f.name && files[j].size === f.size) { dup = true; break; }
    }
    if (dup) continue;
    files.push({ file: f, name: f.name, size: f.size, status: 'pending' });
  }
  renderFileList();
  uploadBtn.disabled = files.length === 0;
  if (files.length > 0) { dropZone.classList.add('has-files'); } else { dropZone.classList.remove('has-files'); }
}

function renderFileList() {
  var html = '';
  for (var i = 0; i < files.length; i++) {
    var f = files[i];
    var statusText = f.status === 'pending' ? 'Pending' : f.status === 'uploading' ? 'Uploading...' : f.status === 'done' ? '✅' : '❌';
    var removeBtn = f.status === 'pending' ? '<span class="remove" onclick="removeFile(' + i + ')">✕</span>' : '';
    html += '<div class="file-item"><span class="name">' + f.name + '</span><span class="status ' + f.status + '">' + statusText + '</span>' + removeBtn + '</div>';
  }
  fileList.innerHTML = html;
}

function removeFile(i) {
  files.splice(i, 1);
  renderFileList();
  uploadBtn.disabled = files.length === 0;
  if (files.length > 0) { dropZone.classList.add('has-files'); } else { dropZone.classList.remove('has-files'); }
}

async function startUpload() {
  uploadBtn.disabled = true;
  uploadBtn.textContent = 'Uploading...';
  for (var i = 0; i < files.length; i++) {
    if (files[i].status === 'done') continue;
    files[i].status = 'uploading';
    renderFileList();
    var formData = new FormData();
    formData.append('image', files[i].file);
    try {
      var res = await fetch('/upload/' + token, { method: 'POST', body: formData });
      var data = await res.json();
      files[i].status = data.success ? 'done' : 'error';
    } catch (e) {
      files[i].status = 'error';
    }
    renderFileList();
    progressFill.style.width = Math.round(((i + 1) / files.length) * 100) + '%';
  }
  await fetch('/upload/' + token + '/done', { method: 'POST' });
  uploadCard.classList.add('hidden');
  completeDiv.classList.remove('hidden');
}
</script>
</body>
</html>`;
}

function getErrorPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Link Expired</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#1a1a2e;color:#eee;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.card{background:#16213e;border-radius:16px;padding:30px;text-align:center}
h1{font-size:1.5rem;color:#ef4444;margin-bottom:8px}
p{color:#8899aa}
</style>
</head>
<body>
<div class="card">
  <h1>⚠️ Link Expired</h1>
  <p>This upload link is no longer valid. Go back to the bot and generate a new one.</p>
</div>
</body>
</html>`;
}

module.exports = { getUploadPage, getErrorPage };
