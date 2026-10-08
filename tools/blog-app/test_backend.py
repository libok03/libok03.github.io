import sys
import tempfile
from pathlib import Path
import unittest
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).parent))
from backend import Workspace, set_metadata, metadata, allowed_stage, digest

SOURCE = '---\ntitle: "원문"\ndraft: true\ndate: 2026-10-07\ncategories:\n  - 논문 리뷰\n---\n\n본문\n'

class WorkspaceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / '_quarto.yml').write_text('project:\n  type: website\n', encoding='utf-8')
        file = self.root / 'posts/test-review/index.qmd'
        file.parent.mkdir(parents=True)
        file.write_text(SOURCE, encoding='utf-8')
        self.w = Workspace(self.root)

    def test_read_returns_serializable_date(self):
        self.assertEqual(self.w.read('test-review')['metadata']['date'], '2026-10-07')

    def test_save_and_conflict(self):
        first = self.w.read('test-review')
        self.w.save('test-review','article',SOURCE+'추가\n',first['revision'])
        with self.assertRaisesRegex(ValueError, '다른 프로그램'):
            self.w.save('test-review','article',SOURCE+'덮어쓰기\n',first['revision'])
        self.assertTrue(self.w.read('test-review')['text'].endswith('추가\n'))

    def test_notes_and_references(self):
        note = self.w.read('test-review', 'notes')
        self.w.save('test-review','notes','비공개 메모',note['revision'])
        self.assertEqual(self.w.read('test-review','notes')['text'],'비공개 메모')
        bib = self.w.read('test-review','references')
        self.w.save('test-review','references','@article{key,title={Example},year={2026}}',bib['revision'])
        self.assertEqual(self.w.read('test-review')['metadata']['bibliography'],'references.bib')

    def test_path_and_private_stage(self):
        with self.assertRaises(ValueError): self.w.path('../outside')
        with self.assertRaises(ValueError): self.w.path('test-review','evil')
        for f in ['notes/private.md','.tools/app.exe','papers/a.pdf','posts/x/notes/a.md']:
            self.assertFalse(allowed_stage(f))
        self.assertTrue(allowed_stage('tools/blog-app/app.py'))
        self.assertTrue(allowed_stage('assets/research/research-sculpture.svg'))

    def test_metadata_preserves_body(self):
        new = set_metadata(SOURCE, {'draft':False,'title':'"특수" 제목','categories':['A','B']})
        self.assertTrue(new.endswith('\n\n본문\n'))
        self.assertEqual(metadata(new)['title'],'"특수" 제목')
        self.assertEqual(metadata(new)['categories'],['A','B'])

    def test_deploy_build_failure_restores_draft_without_push(self):
        calls=[]
        def fake_run(exe,args,**kw):
            calls.append(args)
            if args==['remote','get-url','origin']: return 'https://github.com/libok03/libok03.github.io.git'
            if args==['api','repos/libok03/libok03.github.io']: return '{"permissions":{"admin":true,"push":true},"default_branch":"main"}'
            if args and args[0]=='render': raise RuntimeError('build error')
            return ''
        with patch.object(self.w,'run',fake_run):
            with self.assertRaisesRegex(RuntimeError,'build error'): self.w.publish('test-review')
        self.assertEqual(self.w.read('test-review')['text'],SOURCE)
        self.assertFalse(any(a and a[0]=='push' for a in calls))

    def test_unknown_job_is_rejected(self):
        with self.assertRaises(ValueError): self.w.start('shell','test-review')

    def test_preview_project_renders_only_active_article(self):
        stage = self.w.prepare_preview_project('test-review')
        import yaml
        config = yaml.safe_load((stage / '_quarto.yml').read_text(encoding='utf-8'))
        self.assertEqual(config['project']['render'], ['posts/test-review/index.qmd'])
        self.assertEqual(config['project']['output-dir'], '_rendered')
        self.assertFalse((stage / '.tools').exists())
        self.assertEqual((stage / 'posts/test-review/index.qmd').read_text(encoding='utf-8'), SOURCE)

    def test_cached_preview_does_not_start_renderer(self):
        output = self.root / '_preview/posts/test-review/index.html'
        output.parent.mkdir(parents=True)
        output.write_text('<html></html>')
        fingerprint, _ = self.w.preview_signature('test-review')
        self.w.preview_cache['test-review'] = fingerprint
        with patch.object(self.w, 'run') as run:
            self.assertEqual(self.w.render_preview('test-review'), digest(SOURCE))
            run.assert_not_called()

    def test_older_worker_cannot_clear_newer_job(self):
        self.w.job_sequence = 2
        self.w.job['busy'] = True
        with patch.object(self.w,'tools',side_effect=RuntimeError('old task failed')):
            self.w._worker('login','',1)
        self.assertTrue(self.w.job['busy'])

if __name__ == '__main__': unittest.main()
