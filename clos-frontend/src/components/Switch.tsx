import type { MutableRefObject, Dispatch, SetStateAction } from "react";
import styles from "../pages/index.module.css";
import type { SelectedPath, SwitchRefs } from "../interfaces/interfaces";

interface SwitchProps {
    id: string;
    levelCount: number;
    switchRef: MutableRefObject<SwitchRefs>;
    selected: boolean;
    height: number;
    width: number;
    setSelectedPath: Dispatch<SetStateAction<SelectedPath>>;
}

const Switch: React.FC<SwitchProps> = ({ id, levelCount, switchRef, selected, height, width, setSelectedPath }) => {
    const isServer: boolean = parseInt(id.charAt(0)) === 0;
    return (
        <div
            id={id}
            className={`${styles.card} ${isServer && styles.server} ${selected && styles.selected}`}
            style={{ width, height }}
            ref={(element) => (switchRef.current[id] = element)}
            onClick={() => {
                if (isServer) {
                    setSelectedPath((prev: SelectedPath) => {
                        const next: SelectedPath = { startId: "", endId: "" };
                        if (prev.startId === id) {
                            next.endId = prev.endId;
                        } else if (prev.endId === id) {
                            next.startId = prev.startId;
                        } else {
                            next.startId = prev.startId === "" ? id : prev.startId;
                            next.endId = prev.startId === "" ? prev.endId : id;
                        }
                        return next;
                    });
                }
            }}
        >
            {/* {id} */}
        </div>
    );
};

export default Switch;
