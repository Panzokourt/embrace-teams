import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText, Printer } from 'lucide-react';

interface Props {
  onExportExcel: () => void;
  onExportCSV: () => void;
  onExportPDF: () => void;
}

export function ReportExportMenu({ onExportExcel, onExportCSV, onExportPDF }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Εξαγωγή
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onExportExcel} className="gap-2 cursor-pointer">
          <FileSpreadsheet className="h-4 w-4" />
          Excel (.xls)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onExportCSV} className="gap-2 cursor-pointer">
          <FileText className="h-4 w-4" />
          CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onExportPDF} className="gap-2 cursor-pointer">
          <Printer className="h-4 w-4" />
          Εκτύπωση / PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
