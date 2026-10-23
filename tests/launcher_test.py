"""Exercise the Windows double-click launcher through real cmd.exe."""
import os
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile
import time
import unittest
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
LAUNCHER = ROOT / '启动局域网联机.cmd'


@unittest.skipUnless(os.name == 'nt', 'Windows launcher')
class LauncherTest(unittest.TestCase):
    def run_server(self, launcher, expected):
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            port = sock.getsockname()[1]
        env = os.environ.copy()
        env['PORT'] = str(port)
        with tempfile.TemporaryFile() as output:
            proc = subprocess.Popen('cmd.exe /d /s /c ""' + str(launcher) + '""',
                                    env=env, stdin=subprocess.PIPE, stdout=output,
                                    stderr=subprocess.STDOUT, creationflags=subprocess.CREATE_NO_WINDOW)
            try:
                deadline = time.monotonic() + 15
                while time.monotonic() < deadline:
                    try:
                        with urllib.request.urlopen(f'http://127.0.0.1:{port}', timeout=1) as response:
                            self.assertIn(expected, response.read(1024))
                            return
                    except OSError:
                        time.sleep(.1)
                output.seek(0)
                self.fail(output.read().decode('utf-8', 'replace'))
            finally:
                subprocess.run(['taskkill', '/pid', str(proc.pid), '/t', '/f'],
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                proc.wait(timeout=10)
                proc.stdin.close()

    def test_real_game_starts_via_cmd(self):
        self.run_server(LAUNCHER, b'<!doctype html')

    def test_launcher_handles_spaces_and_unicode_in_folder(self):
        with tempfile.TemporaryDirectory(prefix='mygo launcher 空格 ') as folder:
            folder = Path(folder)
            target = folder / LAUNCHER.name
            shutil.copyfile(LAUNCHER, target)
            (folder / 'server').mkdir()
            (folder / 'server/lan-server.cjs').write_text("require('node:http').createServer((q,s)=>s.end('launcher-path-ok')).listen(Number(process.env.PORT),'127.0.0.1');", 'ascii')
            self.run_server(target, b'launcher-path-ok')

    def test_missing_node_has_readable_message_and_no_command_corruption(self):
        with tempfile.TemporaryDirectory() as folder:
            folder = Path(folder)
            shutil.copyfile(LAUNCHER, folder / 'launch.cmd')
            wrapper = folder / 'missing-node.cmd'
            wrapper.write_bytes(b'@echo off\r\nset "ProgramFiles=%~dp0"\r\nset "LOCALAPPDATA=%~dp0"\r\ncall "%~dp0launch.cmd"\r\nexit /b %errorlevel%\r\n')
            env = {k:v for k,v in os.environ.items() if k.upper() not in ['PATH','PROGRAMFILES','LOCALAPPDATA']}
            env.update(PATH=str(folder))
            command='cmd.exe /d /s /c ""'+str(wrapper)+'""'
            result = subprocess.run(command,
                                    executable=os.environ['COMSPEC'],
                                    env=env, input=b'\r\n', stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                    timeout=10, creationflags=subprocess.CREATE_NO_WINDOW)
            self.assertEqual(result.returncode, 1, result.stdout.decode('utf-8', 'replace'))
            self.assertIn(b'Node.js was not found.', result.stdout)


if __name__ == '__main__':
    unittest.main()
