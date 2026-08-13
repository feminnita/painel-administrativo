import { useColorsAdmin } from "../useColorsAdmin";
import { ColorForm } from "./ColorForm";
import { ColorListView } from "./ColorListView";

export function CharacteristicsPage() {
    const vm = useColorsAdmin();
    return vm.editing !== null ? <ColorForm vm={vm} /> : <ColorListView vm={vm} />;
}
