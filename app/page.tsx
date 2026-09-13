import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./login/actions";
import TaskStatusSelect from "./components/TaskStatusSelect";

async function createProject(formData: FormData) {
  "use server";

  const name = formData.get("name")?.toString().trim();

  if (!name) return;

  await prisma.projects.create({
    data: {
      name,
    },
  });

  revalidatePath("/");
}

async function createTask(formData: FormData) {
  "use server";

  const title = formData.get("title")?.toString().trim();
  const status = formData.get("status")?.toString();
  const projectId = formData.get("projectId")?.toString();

  if (!title || !projectId) return;

  await prisma.tasks.create({
    data: {
      title,
      status: status || "Todo",
      project_id: BigInt(projectId),
    },
  });

  revalidatePath("/");
}

async function updateTaskStatus(formData: FormData) {
  "use server";

  const taskId = formData.get("taskId")?.toString();
  const status = formData.get("status")?.toString();

  if (!taskId || !status) return;

  await prisma.tasks.update({
    where: { id: BigInt(taskId) },
    data: { status },
  });

  revalidatePath("/");
}

async function deleteTask(formData: FormData) {
  "use server";

  const taskId = formData.get("taskId")?.toString();

  if (!taskId) return;

  await prisma.tasks.delete({
    where: { id: BigInt(taskId) },
  });

  revalidatePath("/");
}

async function deleteProject(formData: FormData) {
  "use server";

  const projectId = formData.get("projectId")?.toString();

  if (!projectId) return;

  const id = BigInt(projectId);

  // Remove the project's tasks first so no task is left pointing at a missing project.
  await prisma.$transaction([
    prisma.tasks.deleteMany({ where: { project_id: id } }),
    prisma.projects.delete({ where: { id } }),
  ]);

  revalidatePath("/");
}

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const projects = await prisma.projects.findMany({
    orderBy: {
      created_at: "desc",
    },
  });

  const tasks = await prisma.tasks.findMany({
    orderBy: {
      created_at: "desc",
    },
  });

  return (
    <main className="min-h-screen bg-gray-50 p-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold">TaskFlow SaaS</h1>

            <p className="mt-2 text-gray-600">
              Simple project and task management dashboard
            </p>
          </div>

          <form action={signOut} className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{user.email}</span>

            <button
              type="submit"
              className="rounded-lg border px-4 py-2 text-sm"
            >
              Sign out
            </button>
          </form>
        </div>

        <div className="mt-10 grid gap-8 md:grid-cols-2">
          {/* PROJECTS */}
          <section className="rounded-xl bg-white p-6 shadow">
            <h2 className="text-2xl font-semibold">Projects</h2>

            <form action={createProject} className="mt-5 flex gap-2">
              <input
                name="name"
                placeholder="Project name"
                className="flex-1 rounded-lg border px-3 py-2"
                required
              />

              <button
                type="submit"
                className="rounded-lg bg-black px-4 py-2 text-white"
              >
                Add
              </button>
            </form>

            <div className="mt-6 space-y-3">
              {projects.length === 0 ? (
                <p className="text-gray-500">No projects yet.</p>
              ) : (
                projects.map((project) => (
                  <div
                    key={String(project.id)}
                    className="flex items-center justify-between gap-4 rounded-lg border p-4"
                  >
                    <p className="font-medium">{project.name}</p>

                    <form action={deleteProject}>
                      <input
                        type="hidden"
                        name="projectId"
                        value={String(project.id)}
                      />

                      <button
                        type="submit"
                        className="rounded-lg border px-3 py-1 text-sm text-red-600"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* TASKS */}
          <section className="rounded-xl bg-white p-6 shadow">
            <h2 className="text-2xl font-semibold">Tasks</h2>

            <form action={createTask} className="mt-5 space-y-3">
              <input
                name="title"
                placeholder="Task title"
                className="w-full rounded-lg border px-3 py-2"
                required
              />

              <select
                name="projectId"
                className="w-full rounded-lg border px-3 py-2"
                required
              >
                <option value="">Select project</option>

                {projects.map((project) => (
                  <option
                    key={String(project.id)}
                    value={String(project.id)}
                  >
                    {project.name}
                  </option>
                ))}
              </select>

              <select
                name="status"
                className="w-full rounded-lg border px-3 py-2"
              >
                <option value="Todo">Todo</option>
                <option value="In Progress">In Progress</option>
                <option value="Done">Done</option>
              </select>

              <button
                type="submit"
                className="rounded-lg bg-black px-4 py-2 text-white"
              >
                Add Task
              </button>
            </form>

            <div className="mt-6 space-y-3">
              {tasks.length === 0 ? (
                <p className="text-gray-500">No tasks yet.</p>
              ) : (
                tasks.map((task) => (
                  <div
                    key={String(task.id)}
                    className="rounded-lg border p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <p className="font-medium">{task.title}</p>

                      <form action={deleteTask}>
                        <input
                          type="hidden"
                          name="taskId"
                          value={String(task.id)}
                        />

                        <button
                          type="submit"
                          className="rounded-lg border px-3 py-1 text-sm text-red-600"
                        >
                          Delete
                        </button>
                      </form>
                    </div>

                    <form
                      action={updateTaskStatus}
                      className="mt-2 flex items-center gap-2 text-sm text-gray-500"
                    >
                      <input
                        type="hidden"
                        name="taskId"
                        value={String(task.id)}
                      />

                      <label htmlFor={`status-${task.id}`}>Status:</label>

                      <TaskStatusSelect
                        id={`status-${task.id}`}
                        defaultValue={task.status || "Todo"}
                      />
                    </form>

                    <p className="mt-1 text-sm text-gray-500">
                      Project ID:{" "}
                      {task.project_id
                        ? String(task.project_id)
                        : "None"}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
