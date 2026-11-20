// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { SearchSelect } from "../components/SearchSelect";

afterEach(cleanup);
const options = [
  { value: "", label: "Ninguém" },
  { value: "c0", label: "Mariana Costa" },
  { value: "c1", label: "Rafael Mendes" },
  { value: "c2", label: "Mário Castro" },
];
function Harness({ initial = "" }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <label htmlFor="busca">Cliente</label>
      <SearchSelect
        id="busca"
        options={options}
        value={value}
        onChange={setValue}
      />
      <output>{value || "vazio"}</output>
    </>
  );
}

describe("campo de busca para listas longas", () => {
  it("filtra sem diferenciar acentos e escolhe com clique", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByRole("combobox", { name: "Cliente" });
    await user.type(input, "mar");
    const list = screen.getByRole("listbox");
    expect(
      [...list.querySelectorAll('[role="option"]')].map((o) => o.textContent),
    ).toEqual(["Mariana Costa", "Mário Castro"]);
    await user.click(screen.getByRole("option", { name: "Mário Castro" }));
    expect(screen.getByText("c2", { selector: "output" })).toBeTruthy();
    expect((input as HTMLInputElement).value).toBe("Mário Castro");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("escolhe pelo teclado e mostra quando não há resultado", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByRole("combobox", { name: "Cliente" });
    await user.type(input, "rafa{ArrowDown}{Enter}");
    expect(screen.getByText("c1", { selector: "output" })).toBeTruthy();
    await user.clear(input);
    await user.type(input, "zzz");
    expect(screen.getByText("Nenhum resultado")).toBeTruthy();
  });

  it("mostra o valor inicial e volta ao escolhido ao sair sem escolher", async () => {
    const user = userEvent.setup();
    render(<Harness initial="c1" />);
    const input = screen.getByRole("combobox", {
      name: "Cliente",
    }) as HTMLInputElement;
    expect(input.value).toBe("Rafael Mendes");
    await user.clear(input);
    await user.type(input, "xx");
    await user.tab();
    expect(input.value).toBe("Rafael Mendes");
    expect(screen.getByText("c1", { selector: "output" })).toBeTruthy();
  });
});
