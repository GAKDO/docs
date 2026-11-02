#!/usr/bin/env bash
# 팀장(A) PR 승인·머지 도우미. 13개 레포의 열린 PR을 모아 보여 주고, 필수 검사가 통과한 PR만 승인·머지한다.
#   develop 등으로 가는 PR: squash 머지 + 브랜치 삭제 (CONTRIBUTING.md)
#   release/*·hotfix/* → main 릴리스 PR: merge commit, 브랜치는 남김. develop·main 브랜치는 절대 지우지 않는다
#   내가 올린 PR: 자기 PR은 승인할 수 없어, 필수 검사 통과를 확인한 뒤 관리자 권한(--admin)으로 머지
#   초안·검사 실패·검사 진행 중 PR은 건너뛴다. 실패한 검사를 관리자 권한으로 넘기지 않는다
#   contracts를 먼저 머지한다(계약 PR 먼저, CONTRIBUTING.md)
# 쓰는 법: bash merge-prs.sh          목록을 보고 y로 한 번 확인
#          bash merge-prs.sh --list   목록만
#          bash merge-prs.sh --yes    확인 없이 (팀장 Claude가 돌릴 때)
set -uo pipefail
ORG="${ORG:-GAKDO}"
REPOS="${REPOS:-contracts gateway auth_server rental_server capture_server diagnostics_server report_server web gitops agent booth ml docs}"
MODE="${1:-}"
command -v gh >/dev/null || { echo "gh가 없습니다: brew install gh"; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "gh 로그인이 필요합니다: gh auth login"; exit 1; }
ME="$(gh api user -q .login)"
LIST="$(mktemp)"; ERR="$(mktemp)"; trap 'rm -f "$LIST" "$ERR"' EXIT

for r in $REPOS; do
  gh pr list -R "$ORG/$r" --state open --json number,title,author,baseRefName,headRefName,isDraft \
    -q '.[]|[.number,.author.login,.baseRefName,.headRefName,(.isDraft|tostring),.title]|@tsv' 2>/dev/null |
  while IFS=$'\t' read -r n author base head draft title; do
    if [ "$draft" = true ]; then st=초안
    else
      out="$(gh pr checks "$n" -R "$ORG/$r" --required 2>&1)"; rc=$?
      if [ $rc = 0 ]; then st=통과
      elif [ $rc = 8 ]; then st=진행중
      elif [ "$r" = docs ] && grep -qi "no .*checks reported" <<<"$out"; then st=통과   # docs는 보호 규칙·필수 검사 없음
      elif grep -qi "no .*checks reported" <<<"$out"; then st=진행중                  # 검사가 아직 시작 전
      else st=실패; fi
    fi
    printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$r" "$n" "$author" "$base" "$head" "$st" "$title" >> "$LIST"
  done
done

if [ ! -s "$LIST" ]; then echo "열린 PR이 없습니다."; exit 0; fi
echo "== 열린 PR"
while IFS=$'\t' read -r r n author base head st title; do
  mark="⏸"; [ "$st" = 통과 ] && mark="✅"; [ "$st" = 실패 ] && mark="❌"
  printf "  %s %-19s #%-4s %-8s → %-8s %-14s %s\n" "$mark" "$r" "$n" "$st" "$base" "$author" "$title"
done < "$LIST"
green="$(awk -F'\t' '$6=="통과"' "$LIST" | wc -l | tr -d ' ')"
echo "  (✅ 승인·머지 대상 ${green}개 / ❌ 검사 실패 / ⏸ 초안·검사 진행 중은 건너뜀)"
[ "$MODE" = --list ] && exit 0
[ "$green" = 0 ] && exit 0
if [ "$MODE" != --yes ]; then
  read -r -p "✅ ${green}개를 승인·머지할까요? (영문 y) [y/N] " a; [ "$a" = y ] || [ "$a" = Y ] || { echo "그만둠"; exit 0; }
fi

echo "== 승인·머지"
awk -F'\t' '$6=="통과"' "$LIST" | while IFS=$'\t' read -r r n author base head st title; do
  # 릴리스·핫픽스(→ main)는 merge commit, 나머지(기능 PR, docs)는 squash
  case "$head" in release/*|hotfix/*|develop) how=--merge; del="";; *) how=--squash; del=--delete-branch;; esac
  case "$head" in main|develop) del="";; esac
  if [ "$author" != "$ME" ]; then
    gh pr review "$n" -R "$ORG/$r" --approve -b "팀장 승인: 필수 검사 통과" >/dev/null 2>"$ERR" \
      || { echo "  ❌ ${r} #${n} 승인 실패: $(head -c 160 "$ERR")"; continue; }
  fi
  if gh pr merge "$n" -R "$ORG/$r" $how $del >/dev/null 2>"$ERR"; then
    echo "  ✅ ${r} #${n} 머지 (${how#--})"
  elif gh pr merge "$n" -R "$ORG/$r" $how $del --admin >/dev/null 2>"$ERR"; then
    echo "  ✅ ${r} #${n} 머지 (${how#--}, 관리자 권한: 내 PR이라 승인 대신)"
  else
    echo "  ❌ ${r} #${n} 머지 실패: $(head -c 200 "$ERR")"
  fi
done
echo "끝."
