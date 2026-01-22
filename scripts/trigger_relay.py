"""
릴레이 지휘관 - Stitch에서 Antigravity로 작업 전달
relay_manifest.md의 Turn을 [Antigravity]로 변경하여 검수를 요청합니다.
"""

import os
import time
from pathlib import Path
from datetime import datetime

# 프로젝트 루트 디렉토리
PROJECT_ROOT = Path(__file__).parent.parent
RELAY_MANIFEST = PROJECT_ROOT / 'relay_manifest.md'

def log(message, level="INFO"):
    """타임스탬프와 함께 로그 출력"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    icons = {
        "INFO": "ℹ️",
        "SUCCESS": "✅",
        "WARNING": "⚠️",
        "ERROR": "❌",
        "ACTION": "🚀"
    }
    print(f"[{timestamp}] {icons.get(level, 'ℹ️')} {message}")

def trigger_relay():
    """Stitch에서 Antigravity로 릴레이 트리거"""
    log("=" * 60, "ACTION")
    log("릴레이 지휘관 가동: 안티그래비티의 검수를 요청합니다...", "ACTION")
    log("=" * 60, "ACTION")
    
    # 1. relay_manifest.md 파일 존재 확인
    if not RELAY_MANIFEST.exists():
        log(f"relay_manifest.md 파일을 찾을 수 없습니다: {RELAY_MANIFEST}", "ERROR")
        log("파일을 생성합니다...", "WARNING")
        content = "# 🔄 Relay Manifest: Prompt Jeongeom UI/UX Development\n\n## 1. Current Turn\n\n**Turn: [Antigravity]**\n"
        with open(RELAY_MANIFEST, 'w', encoding='utf-8') as f:
            f.write(content)
        log("relay_manifest.md 파일 생성 완료", "SUCCESS")
        return
    
    # 2. 파일 읽기
    try:
        with open(RELAY_MANIFEST, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        log(f"파일 읽기 오류: {e}", "ERROR")
        return
    
    # 3. Turn을 Antigravity로 변경
    if "Turn: [Stitch]" in content:
        new_content = content.replace("Turn: [Stitch]", "Turn: [Antigravity]")
        new_content = new_content.replace("현재 담당: Stitch", "현재 담당: Antigravity")
        
        try:
            with open(RELAY_MANIFEST, 'w', encoding='utf-8') as f:
                f.write(new_content)
            log("✅ 안티그래비티에게 바톤을 넘겼습니다. (relay_manifest.md 업데이트 완료)", "SUCCESS")
            log("⏳ 안티그래비티의 피드백을 기다리는 중... (파일 변화 감시)", "INFO")
            log("=" * 60, "INFO")
            
            # 4. 안티그래비티가 응답할 때까지 대기 (파일 변화 감시)
            log("파일 변화 감시 시작 (Ctrl+C로 중단 가능)", "INFO")
            last_content = new_content
            check_count = 0
            
            while True:
                time.sleep(2)
                check_count += 1
                
                try:
                    with open(RELAY_MANIFEST, 'r', encoding='utf-8') as f:
                        current_content = f.read()
                    
                    # Turn이 다시 [Stitch]로 변경되었는지 확인
                    if "Turn: [Stitch]" in current_content and "Turn: [Stitch]" not in last_content:
                        log("=" * 60, "SUCCESS")
                        log("🎯 안티그래비티로부터 검수 결과와 다음 미션이 도착했습니다!", "SUCCESS")
                        log("=" * 60, "SUCCESS")
                        break
                    
                    # 내용이 변경되었는지 확인
                    if current_content != last_content:
                        log("relay_manifest.md 파일이 변경되었습니다. (내용 확인 중...)", "INFO")
                        last_content = current_content
                    
                    # 30초마다 상태 출력
                    if check_count % 15 == 0:
                        log(f"대기 중... (체크 횟수: {check_count * 2}초)", "INFO")
                        
                except KeyboardInterrupt:
                    log("=" * 60, "WARNING")
                    log("파일 감시를 중단합니다.", "WARNING")
                    log(f"총 대기 시간: {check_count * 2}초", "INFO")
                    log("=" * 60, "WARNING")
                    break
                except Exception as e:
                    log(f"파일 읽기 오류: {e}", "ERROR")
                    time.sleep(2)
                    
        except Exception as e:
            log(f"파일 쓰기 오류: {e}", "ERROR")
    else:
        current_turn = "Unknown"
        if "Turn: [Antigravity]" in content:
            current_turn = "Antigravity"
        elif "Turn: [Stitch]" in content:
            current_turn = "Stitch"
        
        log(f"현재 Turn이 [Stitch]가 아닙니다. (현재: {current_turn})", "WARNING")
        log("Turn: [Stitch]로 변경된 후 다시 시도해주세요.", "INFO")

if __name__ == "__main__":
    trigger_relay()



