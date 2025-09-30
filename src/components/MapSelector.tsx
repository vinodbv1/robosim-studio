import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MapSelectorProps {
  selectedMap: string;
  onMapSelect: (map: string) => void;
  disabled?: boolean;
}

const AVAILABLE_MAPS = [
  "hm3d_1.png",
  "hm3d_2.png",
  "hm3d_3.png",
  "hm3d_4.png",
  "hm3d_5.png",
  "hm3d_6.png",
  "hm3d_7.png",
  "hm3d_8.png",
  "hm3d_9.png",
  "cave.png"
];

export const MapSelector = ({ selectedMap, onMapSelect, disabled }: MapSelectorProps) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-mono font-semibold text-foreground">
        SELECT MAP
      </label>
      <Select value={selectedMap} onValueChange={onMapSelect} disabled={disabled}>
        <SelectTrigger className="w-full bg-card border-border hover:border-primary/50 transition-colors">
          <SelectValue placeholder="Select a map..." />
        </SelectTrigger>
        <SelectContent>
          {AVAILABLE_MAPS.map((map) => (
            <SelectItem key={map} value={map}>
              {map}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
