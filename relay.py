"""
Relay 스크립트 - 안티그래비티 피드백 수신 및 처리
relay_manifest.md를 읽어서 안티그래비티의 피드백을 확인합니다.
"""
import os
import sys
from pathlib import Path
from datetime import datetime

# Windows 인코딩 설정
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# 프로젝트 루트
PROJECT_ROOT = Path(__file__).parent
RELAY_MANIFEST = PROJECT_ROOT / 'relay_manifest.md'
REQUIREMENTS = PROJECT_ROOT / 'requirements.md'

def read_relay_manifest():
    """relay_manifest.md 파일 읽기"""
    try:
        if not RELAY_MANIFEST.exists():
            return None
        with open(RELAY_MANIFEST, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        print(f"❌ relay_manifest.md 읽기 오류: {e}", file=sys.stderr)
        return None

def extract_feedback(content):
    """안티그래비티 피드백 추출"""
    feedback_section = None
    lines = content.split('\n')
    
    # "Next Steps" 또는 "Feedback" 섹션 찾기
    in_feedback_section = False
    feedback_lines = []
    
    for i, line in enumerate(lines):
        if '##' in line and ('Next Steps' in line or 'Feedback' in line or 'URGENT' in line or '주의' in line):
            in_feedback_section = True
            feedback_lines.append(line)
        elif in_feedback_section:
            if line.startswith('##') and not ('Next Steps' in line or 'Feedback' in line or 'URGENT' in line):
                break
            feedback_lines.append(line)
    
    if feedback_lines:
        return '\n'.join(feedback_lines)
    
    # 전체 내용 반환
    return content

def main():
    """메인 함수"""
    print("🔄 Relay 스크립트 실행 중...")
    print(f"📁 프로젝트 루트: {PROJECT_ROOT}")
    print(f"📄 매니페스트: {RELAY_MANIFEST}")
    print("=" * 60)
    
    content = read_relay_manifest()
    
    if not content:
        print("⚠️ relay_manifest.md 파일을 찾을 수 없습니다.")
        sys.exit(1)
    
    # 현재 Turn 확인
    if "Turn: [Stitch]" in content:
        current_turn = "Stitch"
    elif "Turn: [Antigravity]" in content:
        current_turn = "Antigravity"
    else:
        current_turn = "Unknown"
    
    print(f"📌 현재 Turn: {current_turn}")
    print("=" * 60)
    
    # 피드백 추출
    feedback = extract_feedback(content)
    
    if feedback:
        print("\n📝 안티그래비티 피드백:")
        print("=" * 60)
        print(feedback)
        print("=" * 60)
    else:
        print("\n⚠️ 피드백이 없습니다.")
    
    # requirements.md도 출력 (참고용)
    try:
        if REQUIREMENTS.exists():
            with open(REQUIREMENTS, 'r', encoding='utf-8') as f:
                requirements_content = f.read()
            print("\n📋 Requirements.md 요약:")
            print("=" * 60)
            # 첫 500자만 출력
            summary = requirements_content[:500]
            if len(requirements_content) > 500:
                summary += "..."
            print(summary)
            print("=" * 60)
    except Exception as e:
        print(f"⚠️ requirements.md 읽기 오류: {e}")
    
    print("\n✅ Relay 스크립트 완료")

if __name__ == "__main__":
    main()

