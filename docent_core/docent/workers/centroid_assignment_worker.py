from docent_core._db_service.db import DocentDB
from docent_core.docent.db.contexts import ViewContext
from docent_core.docent.db.schemas.tables import SQLAJob
from docent_core.docent.services.monoservice import MonoService
from docent_core.docent.services.rubric import RubricService


async def centroid_assignment_job(ctx: ViewContext, job: SQLAJob):
    db = await DocentDB.init()
    mono_svc = await MonoService.init()

    async with db.session() as session:
        rs = RubricService(session, db.session, mono_svc)
        sqla_rubric = await rs.get_rubric(job.job_json["rubric_id"], version=None)
        if sqla_rubric is None:
            raise ValueError(f"Rubric {job.job_json['rubric_id']} not found")
        await rs.assign_centroids(sqla_rubric)


async def clustering_job(ctx: ViewContext, job: SQLAJob):
    db = await DocentDB.init()
    mono_svc = await MonoService.init()

    async with db.session() as session:
        rs = RubricService(session, db.session, mono_svc)
        await rs.run_clustering_job(ctx, job)
